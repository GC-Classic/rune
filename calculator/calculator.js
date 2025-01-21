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
            <summary>Buffs
                <!--prop-icon prop="CAC"></prop-icon><data class="boost " title="CAC"></data>
                <prop-icon prop="CAD"></prop-icon><data class="boost " title="CAD"></data>
                <prop-icon prop="HS"></prop-icon><data class="boost percent" title="HS"></data-->
            </summary>
            <buff-form></buff-form>
        </details>
        <details>
            <summary>Runes</summary>
            <rune-form></rune-form>
        </details>`;
    }
    trigger = (el, ev) => (typeof el == 'string' ? this.shadowRoot.Q(el) : el).dispatchEvent(new Event(ev, {bubbles: true}));
    connectedCallback() {
        this.saved ? this.fill() : this.sample();
        setTimeout(() => this.events());
        this.el = {
            character: this.shadowRoot.Q('char-form'),
            buffs: this.shadowRoot.Q('buff-form'),
            runes: this.shadowRoot.Q('rune-form')
        }
    }
    events() {
        this.onchange = () => this.calculate();
        Delta.observe(this.shadowRoot);
        Object.assign(this.shadowRoot.Q('#pref'), {
            onchange: ev => {
                ev.target.previousElementSibling.style.background = ev.target.value;
                Menu.arrange();
                this.save();
            },
            onclick: ({target: {id}}) => id == 'delete' ? this.delete() : id == 'scroll' ? scrollTo(0,0) : null,
        });
        this.shadowRoot.Q('#pref').oninput = () => this.edited = true;
        this.trigger('input[type=color]', 'change');
    }
    fill() {
        this.id = this.saved.id;
        this.shadowRoot.Q('input[name=name]').value = this.saved.name;
        this.shadowRoot.Q('input[type=color]').value = this.saved.color;
        Object.entries(this.saved.character).forEach(([p, v]) => this.shadowRoot.Q(`input[placeholder=${p}]`) && (this.shadowRoot.Q(`input[placeholder=${p}]`).value = v));
    }
    sample() {
        this.shadowRoot.Q('input[name=name]').value = `Character ${[...this.parentElement.children].indexOf(this) + 1}`;
    }

    calculate() {
        let before = new Stats(this.el.character.before);

        let {setup, buffs} = this.el.buffs;
        let {deltas} = this.el.runes; 
        let runeDeltas = this.el.character.calculate(deltas);
        this.el.runes.receiveDelta(runeDeltas); 
        this.el.character.receiveDelta(new Stats().add(...deltas ?? []));

        let damage = Damage({...before, ...setup, buff: buffs});
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
            character: this.el.character,
        };
        DB.put('characters', this.id ? [parseInt(this.id), data] : data).then(ev => this.id = ev.target.result).catch(er => Q('header p').textContent = er);
    }
    delete() {
        (this.id ? DB.delete('characters', parseInt(this.id)) : Promise.resolve()).then(() => this.remove());
    }
}
Calculator.add = data => {
    typeof data == 'boolean' && (data = null);
    Q('section').appendChild(new Calculator(data))[data ? null : 'scrollIntoView']?.();
}
Calculator.delete = checked => Q('rune-calculator', cal => cal.classList.toggle('delete', checked));
Calculator.abbr = checked => Q('aside').classList.toggle('remind', checked);
customElements.define('rune-calculator', Calculator);

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
