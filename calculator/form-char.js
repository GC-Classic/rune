class CharForm extends Form {
    constructor() {
        super();
        this.shadowRoot.append(...CharForm.all.flatMap((prop, i) => [
                E('label', [
                    E('prop-icon', {prop}), 
                    E('input', {
                        type: 'number', placeholder: prop, value: CharForm.default[i],
                        step: Stats.decimals.includes(prop) ? .01 : 1,
                        classList: ['attacking','damaging'].map(t => CharForm[t].includes(prop) ? t : '').join(' ')
                    }),
                ]), 
                E('data', {classList: 'boost', title: prop}),
                E('input', {classList: 'formula', name: prop, placeholder: '='})
            ]),
            E('h3', [
                E('span', 'Total Attack'), E('span', '綜合戰鬥力'),
                E('output', {name: 'TA'}), E('data', {classList: 'delta', title: 'TA'})
            ])
        );
    }
    connectedCallback () {
        super.connectedCallback();
        this.numbers = this.shadowRoot.Q('input[type=number]');
        this.formulae = this.shadowRoot.Q('.formula');
        this.data = this.shadowRoot.Q('.boost');
        this.events();
        this.classList.add('runes');
        this.serialize();
    }
    events () {
        this.numbers.forEach(input => input.onchange = () => this.serialize('number'));
        this.formulae.forEach(input => {
            input.onclick = () => this.formula.edit(input);
            input.onchange = () => this.formula.evaluate(input);
        });
    }
    formula = {
        evaluate: (input) => {
            input.setCustomValidity('');
            input.dataset.formula = input.value;
            let result = eval(input.value);
            if (typeof result != 'number') 
                return input.setCustomValidity('Syntax wrong');
            input.value = result;
            input.classList.remove('posi', 'nega');
            input.classList.add(result > 0 ? 'posi' : result < 0 ? 'nega' : '');
            this.serialize('formula');
        },
        edit: input => input.value = input.dataset.formula ?? ''
    }
    serialize (field) {
        (field == null || field == 'number') &&
            (this.before = this.numbers.reduce((obj, input) => ({...obj, [input.placeholder]: parseFloat(input.value || 0)}), {}));
        (field == null || field == 'formula') &&
            (this.delta = this.formulae.reduce((obj, input) => ({...obj, [input.name]: parseFloat(input.value || 0)}), {}));
        this.calculate();
    }
    setDelta (stats) {
        this.delta = stats;
        Object.entries(stats).forEach(([p, v]) => this.shadowRoot.Q(`data[title=${p}]`).value = v);
        this.calculate();
    }
    calculate () {
        this.before = new Stats(this.before);
        this.after = new Stats(this.before).add(this.delta);
        this.shadowRoot.Q('output').value = Math.round(this.after.TA);
        setTimeout(() => this.shadowRoot.Q('output+data').value = Math.round(this.after.TA - this.before.TA));
    }
    static attacking = ['A','CAC','CAD','SA','MP','D','V','SD','HP'];
    static damaging = ['A','CAC','CAD','SA','HSC','HS','TR','BAD'];
    static all = ['A','D','CAC','V','CAD','CAR','SA','SD','MP','HP','HSC','CD','HS','GP','TR','BAD'];
    static default = [15000,8000,50,8000,400,30,8000,900,50,30,10,30,24,1,12,37.5]
}
customElements.define('char-form', CharForm);