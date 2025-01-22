class Calculator extends HTMLElement {
    constructor(data) {
        super();
        this.saved = data;
        this.attachShadow({mode: 'open'}).innerHTML = `
        <link rel="stylesheet" href="/common.css">
        <link rel="stylesheet" href="calculator.css">
        <form id="pref">
            <button type="button" class="action" id="delete"><span>Delete</span><span>刪除</span></button>
            <button type="button" id="scroll">🔝</button>
            <input name="name">
            <input type="color" value=#0000ff>
        </form>
        <char-form></char-form>
        <ul>
            <li><output></output>
            <li class="normal"><prop-icon prop="HS"></prop-icon><output></output>
            <li><prop-icon prop="CAD"></prop-icon><output></output>
            <li class="normal"><prop-icon prop="CAD"></prop-icon><prop-icon prop="HS"></prop-icon><output></output>
            <li><prop-icon prop="BAD"></prop-icon><output></output>
            <li class="normal"><prop-icon prop="BAD"></prop-icon><prop-icon prop="HS"></prop-icon><output></output>
            <li><prop-icon prop="BAD"></prop-icon><prop-icon prop="CAD"></prop-icon><output></output>
            <li class="normal"><prop-icon prop="BAD"></prop-icon><prop-icon prop="CAD"></prop-icon><prop-icon prop="HS"></prop-icon><output></output>
            <li><span>Average damage</span><span>平均傷害</span><output></output>
        </ul>
        <details>
            <summary>Buffs & settings</summary>
            <buff-form></buff-form>
        </details>
        <details>
            <summary>Runes</summary>
            <form id="rune">
                <input type="radio" name="shape" id="shape-0">
                <label for="shape-0"><data class="delta"></data></label>
                <fieldset>
                    <div class="from">
                        <input placeholder="Equipped rune" name="shape-0" id="from-0">
                        <em></em>
                    </div>
                    <div class="change">
                        <label for="from-0" class="rune-slot"></label>
                        <input type="checkbox" id="switch-0" checked>
                        <label for="switch-0">⟶</label>
                        <label for="to-0" class="rune-slot"></label>
                    </div>
                    <div class="to">
                        <em></em>
                        <input placeholder="Subject rune" name="shape-0" id="to-0">
                        <select></select>
                    </div>
                </fieldset>
            </form>
        </details>`;
        let template = this.shadowRoot.Q('#rune').cloneNode(true);
        for (let s = 3; s <= 6; s++) {
            let temp = template.cloneNode(true);
            temp.Q('[id$="-0"]', el => el.id = el.id.replace(/\d$/, s));
            temp.Q('[name$="-0"]', el => el.name = el.name.replace(/\d$/, s));
            temp.Q('[for$="-0"]', el => el.htmlFor = el.htmlFor.replace(/\d$/, s));
            temp.Q('label:not(.rune-slot)', label => label.style.backgroundImage = `url(/rune/shape/${s}.webp)`);
            this.shadowRoot.Q('#rune').append(...temp.children);
        }
        this.shadowRoot.Q('#rune').append(E('figure'), E('figure'));
    }
    trigger = (el, ev) => (typeof el == 'string' ? this.shadowRoot.Q(el) : el).dispatchEvent(new Event(ev, {bubbles: true}));
    connectedCallback() {
        this.TA = this.shadowRoot.Q('#TA');
        this.saved ? this.fill() : this.sample();
        setTimeout(() => this.events());
    }
    events() {
        Delta.observe(this.shadowRoot);
        Object.assign(this.shadowRoot.Q('#pref'), {
            onchange: ev => {
                ev.target.previousElementSibling.style.background = ev.target.value;
                Menu.arrange();
                this.save();
            },
            onclick: ({target: {id}}) => id == 'delete' ? this.delete() : id == 'scroll' ? scrollTo(0,0) : null,
        });
        this.shadowRoot.Q('#rune').onchange = ({target: input}) => {
            if (input.type == 'text') {
                let select = input.closest('div').Q('select');
                let slot = input.closest('fieldset').Q(`.rune-slot:${input.matches(':first-child') ? 'first' : 'last'}-child`);
                if (!input.value) {
                    select?.options[select.selectedIndex]?.remove();
                    select && (select.value = '');
                    return slot.replaceChildren();
                }
                let rune = Calculator.parse(input, input.id.split('-')[1]);
                if (!rune) return;
                let string = rune.stringify().replace(/^\[.\]/, '');
                input.value = string.replace(/[(){},]/g, ' $& ');
                this.shadowRoot.Q(`option[value="${string}"]`) || select?.append(E('option', string, {value: string, selected: true}));
                slot.replaceChildren(new RuneElement(rune));
            }
            else if (input.type == 'select-one') {
                let text = input.closest('div').Q('input');
                text.value = input.value;
                this.trigger(text, 'change');
            }
            input.type != 'radio' && (this.calculate(), this.save());
        };
        this.shadowRoot.Q('#pref').oninput = this.shadowRoot.Q('#rune').oninput = () => this.edited = true;
        this.shadowRoot.Q('#shape-0').checked = true;
        this.shadowRoot.Q(':is(.from,.to) input', input => this.trigger(input, 'change'));
        this.trigger('input[type=color]', 'change');
    }
    fill() {
        this.id = this.saved.id;
        this.shadowRoot.Q('input[name=name]').value = this.saved.name;
        this.shadowRoot.Q('input[type=color]').value = this.saved.color;
        Object.entries(this.saved.character).forEach(([p, v]) => this.shadowRoot.Q(`input[placeholder=${p}]`) && (this.shadowRoot.Q(`input[placeholder=${p}]`).value = v));
        this.shadowRoot.Q('.from input').forEach((input, i) => input.value = this.saved.equipped[i] || '');
        this.shadowRoot.Q('select', (select, i) => {
            select.append(...[this.saved.subject[i] || []].flat().map(r => E('option', r, {value: r})));
            select.closest('div').Q('input').value = select.options[0]?.value ?? '';
            select.closest('fieldset').Q('.change input').checked = this.saved.checked?.[i] ?? true;
        });
    }
    sample() {
        this.shadowRoot.Q('input[name=name]').value = `Character ${[...this.parentElement.children].indexOf(this) + 1}`;
        this.shadowRoot.Q(':is(.from,.to) input', input => input.value = new Rune([input.name.split('-')[1]]).stringify().replace(/^\[.\]/, ''));
    }

    character = () => this.shadowRoot.Q('char-form').before;
    equipped = Object.assign(() => this._equipped ??= this.shadowRoot.Q('.rune-slot:first-child'), {
        runes: () => this.equipped().map(slot => slot.firstElementChild?.rune?.stats),
        sets: () => Runes.sets.find(this.equipped().map(slot => slot.firstElementChild))
    });
    subject = Object.assign(() => this._subject ??= this.equipped().map(rune => rune.parentElement.Q('input:checked~.rune-slot') ?? rune), {
        runes: () => this.subject().map(slot => slot.firstElementChild?.rune?.stats),
        sets: () => Runes.sets.find(this.subject().map(slot => slot.firstElementChild))
    });
    calculate() {
        this._equipped = this._subject = null;
        let equipped = this.equipped.runes(), subject = this.subject.runes();
        let [beforeSetImgs, afterSetImgs] = ['equipped', 'subject'].map(w => this[w].sets().map(s => E('img', {src: `/rune/set/${s}.webp`})));
        this.shadowRoot.Q('figure:first-of-type').replaceChildren(...beforeSetImgs);
        this.shadowRoot.Q('figure:last-of-type').replaceChildren(...afterSetImgs);

        equipped.sets = this.equipped.sets().map(s => Rune.set.effect[s]);
        subject.sets = this.subject.sets().map(s => Rune.set.effect[s]);
        let before = new Stats(this.character());
        let runeless = before.minus(...equipped, ...equipped.sets);
        let after = runeless.add(...subject, ...subject.sets);

        
        this.shadowRoot.Q('char-form').setDelta(after.minus(before));
        subject.forEach((_, i) => 
            this.shadowRoot.Q(`#rune>label:nth-of-type(${i+1}) data`).value = after.TA - after.minus(subject[i]).add(equipped[i]).TA
        );
        let damage = Damage({...before, BAP:30, TD: 0, Lv: 85, monsterLv: 85, skill: 3, buff: {HS:0,A:0}});
        [
            damage.basic, damage.basic + damage.HS, damage.basic * damage.critical, damage.basic * damage.critical + damage.HS, 
            damage.basic * damage.back, damage.basic * damage.back + damage.HS, damage.basic * damage.back * damage.critical, damage.basic * damage.back * damage.critical + damage.HS,
            damage.average 
        ].forEach((value, i) => this.shadowRoot.Q(`li:nth-of-type(${i+1}) output`).value = value.toFixed(0));

    }
    save() {
        if (!this.edited && !this.saved) return;
        let data = {
            name: this.shadowRoot.Q('input[name=name]').value,
            color: this.shadowRoot.Q('input[type=color]').value,
            character: this.character(),
            equipped: this.shadowRoot.Q('.rune-slot:first-child').map(slot => slot.firstElementChild?.rune.stringify().replace(/^\[.\]/, '')),
            subject: this.shadowRoot.Q('select').map(select => [...select.options].map(op => op.value)),
            checked: this.shadowRoot.Q('#rune .change input').map(input => input.checked)
        };
        DB.put('characters', this.id ? [parseInt(this.id), data] : data).then(ev => this.id = ev.target.result).catch(er => Q('header p').textContent = er);
    }
    delete() {
        (this.id ? DB.delete('characters', parseInt(this.id)) : Promise.resolve()).then(() => this.remove());
    }
    static parse = (input, shape) => { 
        let em = input.parentElement.Q('em');
        em.innerHTML = '';
        try {
            let [, tier, grade, level, primary, secondary, set] = /^t?(\d)?(.)?\+?(\d+)?(.+?)?(?:\((.*?)\))?(?:\{(.*?)\})?$/i.exec(input.value.replaceAll(' ', ''));
            tier = parseInt(tier);
            if (!(tier >= 1 && tier <= 5))
                throw ('invalid-tier');
            grade = Rune.grade.indexOf(grade?.toUpperCase());
            if (grade < 0)
                throw ('invalid-grade');
            level = parseInt(level);
            if (!(level >= 0 && level <= 10))
                throw ('invalid-level');
            primary = primary?.toUpperCase();
            if (!Rune.primary[shape].includes(primary))
                throw ('invalid-primary');
            
            let rune = {shape, tier, grade, primary: {prop: primary, level}};
            secondary = Calculator.parse.secondary(secondary, rune);
            set = set?.toLowerCase();
            /^[一-龢]+$/.test(set) && (set = Q('template').content.Q('#set li').find(li => li.textContent.trim() == set).id || set);
            if (set && !Rune.set.flat().includes(set))
                throw ('invalid-set');

            return new Rune({ ...rune, secondary, set });
        } catch (er) { Calculator.error(em, er) }
    }
    static error = (em, er) => typeof er == 'string' ? em.replaceChildren(...Q('template').content.Q(`#${er}`).cloneNode(true).children) : console.error(er);
    static secondaryLevel = (tier, prop, value) => {
        let {secondary} = Rune.values;
        return Math.round((parseFloat(value) / (Rune.values.base[prop] + (secondary.correct[prop] ?? 0)) 
        / (1 + secondary.multiple + tier * secondary.tier) - 1) / secondary.level);
    }
}
Object.assign(Calculator.parse, {
    secondary: (string, {tier, grade, primary}) => {
        let secondary = string ? string.split(/,/).map(s => {
            let [, prop, level] = /^([A-z]+)(.*)$/.exec(s.replaceAll('"', "''"));
            prop = prop.toUpperCase();
            level = /^[\d.]+$/.test(level) ? Calculator.secondaryLevel(tier, prop, level) : level.length;
            return ({prop, level});
        }) : [];
        let realized = [primary.prop, ...secondary.map(s => s.prop)];
        if (new Set(realized.filter(prop => Rune.secondary[prop])).size < realized.length)
            throw('invalid-secondary');
        if (!secondary.every(({level}) => level >= 0 && level <= 2))
            throw('invalid-secondary-level');

        let secondaries = grade + Math.floor(primary.level/3) + (primary.level == 10);
        let count = Math.min(3, secondaries);
        let reinforces = secondaries - count;
        if (secondary.length != count || secondary.reduce((sum, {level}) => sum += level, 0) != reinforces)
            throw('unmatched-secondary');
        return secondary;
    }
});
Calculator.add = data => {
    typeof data == 'boolean' && (data = null);
    Q('section').appendChild(new Calculator(data))[data ? null : 'scrollIntoView']?.();
}
Calculator.delete = checked => Q('rune-calculator', cal => cal.classList.toggle('delete', checked));
Calculator.abbr = checked => Q('aside').classList.toggle('remind', checked);
customElements.define('rune-calculator', Calculator);

const Buff = {
    rune: {
        'fury-1':{A:5},'fury-2':{A:5},'fight-1':{A:2.5},'fight-2':{A:2.5},
        rage:{A:10},hunt:{A:10},punish:{A:10},
        'roar-1':{HS:10},'roar-2':{HS:10}
    },
    title: {
        t1:{A:10,CAC:1.5},t2:{A:5,CAC:1.5},t3:{A:10,CAC:1.5},t4:{A:5,CAC:1.5},t5:{A:5,CAC:1.5},
    },
    item: {
        i1:{A:10},i2:{A:10},i3:{A:10},i4:{A:15},i5:{A:15},
    },
}
const Damage = ({A, SA, CAC, CAD, BAP, BAD, HSC, HS, TD, TR, Lv, monsterLv, skill, buff}, normal = true) => {
    let seniority = Math.max(Lv - monsterLv - 5, 0);
    let NTD = Math.max(TD - TR, 0);
    CAC += buff?.CAC || 0, BAD += buff?.BAD || 0;
    [CAC, CAD, BAD] = TD === 0 ? [Math.min(CAC, 100), CAD, BAD] : 
        [Math.min(Math.max(0, CAC - 20), 100), Math.max(-50, CAD - 250), Math.max(-30, CAD - 50)];
    
    let damage = {};
    damage.HS = Damage.HS(HS, NTD, buff, normal);
    damage.basic = Damage.basic(A, SA, skill, NTD, seniority, buff, normal);
    damage.critical = Damage.critical(CAD);
    damage.back = Damage.back(BAD);
    damage.average = Damage.average(damage.basic, CAC, damage.critical, HSC, damage.HS, BAP, damage.back);
    return damage;
}
Object.assign(Damage, {
    basic: (A, SA, skill, NTD, seniority, buff, normal) =>
        (normal ? A*Damage.normal : (A+SA)*Damage.special) * (1 + buff.A/100) * skill * (1 + .02*seniority) * (1 - NTD/100),

    HS: (HS, NTD, buff, normal) => HS * (1 + buff.HS/100) * (1 - NTD/100) * normal,
    critical: (CAD) => Math.max(1, 1.5 + CAD/100),
    back: (BAD) => Math.max(1, 1.3 + BAD/100),
    average: (basic, CAC, critical, HSC, HS, BAP, BAD) => {
        let afterCritical = CAC/100*critical*basic + (1 - CAC/100)*basic;
        return BAP/100*afterCritical*BAD + (1 - BAP/100)*afterCritical + HSC/100*HS
    },
    normal: .0168, special: .005469
});
Object.assign(Calculator, {
    build: (name, type, src) => 
        Object.entries(Buff[name]).map(([id, value]) => E('label', [
            E('input', {id, type, ...type ? {name} : {}, value: JSON.stringify(value)}), 
            E('img', {src: src(id)})]
        )),
    rune: () => Calculator.build('rune', 'checkbox', id => `/rune/set/${id.split('-')[0]}.webp`),
    item: () => Calculator.build('item', 'checkbox', id => `/damage/buffs/${id}.png`),
    title: () => Calculator.build('title', 'radio', id => `/damage/buffs/${id}.webp`),

    add: data => {
        typeof data == 'boolean' && (data = null);
        data instanceof Node && (data = data.shadowRoot.Q('input'));
        Q('main').appendChild(new Calculator(data))[data ? null : 'scrollIntoView']?.();
    }
});
