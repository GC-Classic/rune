class RuneForm extends Form {
    constructor() {
        super();
        this.shadowRoot.append(E('form', [
            ...[0,3,4,5,6].flatMap(s => [
                E('label', [
                    E('input', {type: 'radio', name: 'shape', checked: s === 0}),
                    E('data', {classList: 'delta'})
                ]),
                E('fieldset', [
                    E('div', {classList: 'from'}, [
                        E('input', {id: `from-${s}`, name: `shape-${s}`, placeholder: 'Equipped'}),
                        E('em')
                    ]),
                    E('div', {classList: 'change'}, [
                        E('label', {htmlFor: `from-${s}`, classList: 'rune-slot'}),
                        E('label', ['⟶',
                            E('input', {type: 'checkbox', id: `switch-${s}`, checked: true})
                        ]),
                        E('label', {htmlFor: `to-${s}`, classList: 'rune-slot'}),
                    ]),
                    E('div', {classList: 'to'}, [
                        E('em'),
                        E('input', {id: `to-${s}`, name: `shape-${s}`, placeholder: 'Subject'}),
                        E('select')
                    ]),
                ])
            ]),
            E('figure'), E('figure')
        ]));
    }
    connectedCallback () {
        super.connectedCallback();
        this.events();
        this.els = {
            data: this.shadowRoot.Q('.delta'),
            switches: this.shadowRoot.Q('[id|=switch]'),
            slots: {
                before: this.shadowRoot.Q('.rune-slot:first-child'),
                after: this.shadowRoot.Q('.rune-slot:last-child')
            }
        }
    }            
    events () {
        this.shadowRoot.Q('form').onchange = ({target: input}) => {
            if (input.type == 'text') {
                let select = input.closest('div').Q('select');
                let slot = input.closest('fieldset').Q(`.rune-slot:${input.matches(':first-child') ? 'first' : 'last'}-child`);
                if (!input.value) {
                    select?.options[select.selectedIndex]?.remove();
                    select && (select.value = '');
                    slot.replaceChildren();
                    return this.serialize();
                }
                let rune = RuneForm.parse(input, input.id.split('-')[1]);
                if (!rune) return this.serialize();
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
            input.type != 'radio' && this.serialize();
        };
    }
    serialize () {
        this.sets = {
            before: Runes.sets.find(this.els.slots.before.map(s => s.firstElementChild)),
            after: Runes.sets.find(this.els.switches.map((input, i) => this.els.slots[input.checked ? 'after' : 'before'][i].firstElementChild)),
        }
        this.registerSet('before');
        this.registerSet('after');
        this.deltas = [...this.els.switches.map((input, i) => input.checked ?
            RuneForm.getStats(this.els.slots.after[i]).minus(RuneForm.getStats(this.els.slots.before[i])) :
            new Stats() 
        ), new Stats().add(...this.sets.after).minus(...this.sets.before)];

        console.log(this.deltas);
    }
    receiveDelta (values) {
        this.els.data.forEach((data, i) => data.value = values[i]);
    }
    registerSet (where) {
        this.shadowRoot.Q(`figure:${where == 'before' ? 'first' : 'last'}-of-type`).replaceChildren(
            ...this.sets[where].map(s => E('img', {src: `/rune/set/${s}.webp`}))
        );
        this.sets[where] = this.sets[where].map(s => Rune.set.effect[s]);
    }
    static getStats = slot => new Stats(slot.firstElementChild?.rune?.stats);
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
            secondary = RuneForm.parse.secondary(secondary, rune);
            set = set?.toLowerCase();
            /^[一-龢]+$/.test(set) && (set = Q('template').content.Q('#set li').find(li => li.textContent.trim() == set).id || set);
            if (set && !Rune.set.flat().includes(set))
                throw ('invalid-set');

            return new Rune({ ...rune, secondary, set });
        } catch (er) { RuneForm.error(em, er) }
    }
    static error = (em, er) => typeof er == 'string' ? em.replaceChildren(...Q('template').content.Q(`#${er}`).cloneNode(true).children) : console.error(er);
    static secondaryLevel = (tier, prop, value) => {
        let {secondary} = Rune.values;
        return Math.round((parseFloat(value) / (Rune.values.base[prop] + (secondary.correct[prop] ?? 0)) 
        / (1 + secondary.multiple + tier * secondary.tier) - 1) / secondary.level);
    }
}
Object.assign(RuneForm.parse, {
    secondary: (string, {tier, grade, primary}) => {
        let secondary = string ? string.split(/,/).map(s => {
            let [, prop, level] = /^([A-z]+)(.*)$/.exec(s.replaceAll('"', "''"));
            prop = prop.toUpperCase();
            level = /^[\d.]+$/.test(level) ? RuneForm.secondaryLevel(tier, prop, level) : level.length;
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
customElements.define('rune-form', RuneForm);