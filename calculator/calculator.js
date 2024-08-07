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
        <form id="char">
            <h3><span>Total Attack</span><span>綜合戰鬥力</span></h3>
            <data id="TA" class="delta"></data>
        </form>
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
        </form>`;
        this.shadowRoot.Q('#char').append(...Stats.order.flatMap(prop => [
            E('label', [
                E('prop-icon', {prop}), 
                E('input', {type: 'number', placeholder: prop, step: Stats.decimals.includes(prop) ? .01 : 1})
            ]), 
            E('data', {classList: 'boost', title: prop})
        ]));
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
        this.shadowRoot.Q('#char').onchange = () => (this.calculate(), this.save());
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
        this.shadowRoot.Q('#pref').oninput = this.shadowRoot.Q('#rune').oninput = this.shadowRoot.Q('#char').oninput = () => this.edited = true;
        this.shadowRoot.Q('#shape-0').checked = true;
        this.shadowRoot.Q(':is(.from,.to) input', input => this.trigger(input, 'change'));
        this.trigger('input[type=color]', 'change');
    }
    fill() {
        this.id = this.saved.id;
        this.shadowRoot.Q('input[name=name]').value = this.saved.name;
        this.shadowRoot.Q('input[type=color]').value = this.saved.color;
        Object.entries(this.saved.character).forEach(([p, v]) => this.shadowRoot.Q(`input[placeholder=${p}]`).value = v);
        this.shadowRoot.Q('.from input').forEach((input, i) => input.value = this.saved.equipped[i] || '');
        this.shadowRoot.Q('select', (select, i) => {
            select.append(...[this.saved.subject[i] || []].flat().map(r => E('option', r, {value: r})));
            select.closest('div').Q('input').value = select.options[0]?.value ?? '';
            select.closest('fieldset').Q('.change input').checked = this.saved.checked?.[i] ?? true;
        });
    }
    sample() {
        this.shadowRoot.Q('input[name=name]').value = `Character ${[...this.parentElement.children].indexOf(this) + 1}`;
        Object.entries(Stats.sample).forEach(([p, v]) => this.shadowRoot.Q(`input[placeholder=${p}]`).value = v);
        this.shadowRoot.Q(':is(.from,.to) input', input => input.value = new Rune([input.name.split('-')[1]]).stringify().replace(/^\[.\]/, ''));
    }

    character = () => this.shadowRoot.Q('input[type=number]').reduce((obj, input) => ({...obj, [input.placeholder]: parseFloat(input.value || 0)}), {});
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
        this.shadowRoot.Q('figure:first-of-type').replaceChildren(...this.equipped.sets().map(s => E('img', {src: `/rune/set/${s}.webp`})));
        this.shadowRoot.Q('figure:last-of-type').replaceChildren(...this.subject.sets().map(s => E('img', {src: `/rune/set/${s}.webp`})));

        equipped.sets = this.equipped.sets().map(s => Rune.set.effect[s]);
        subject.sets = this.subject.sets().map(s => Rune.set.effect[s]);
        let before = new Stats(this.character());
        let runeless = before.minus(...equipped, ...equipped.sets);
        let after = runeless.add(...subject, ...subject.sets);

        this.TA.textContent = after.TA.toFixed(0);
        this.TA.value = after.TA - before.TA;
        Object.entries(after.minus(before)).forEach(([p, v]) => this.shadowRoot.Q(`data[title=${p}]`).value = v);
        subject.forEach((_, i) => 
            this.shadowRoot.Q(`#rune>label:nth-of-type(${i+1}) data`).value = after.TA - after.minus(subject[i]).add(equipped[i]).TA
        );
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
