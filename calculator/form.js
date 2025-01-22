class Form extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'}).append(
            E('link', {rel: 'stylesheet', href: '/common.css'}),
            E('link', {rel: 'stylesheet', href: 'form.css'})
        );
    }
    connectedCallback() {
        this.observe(this.shadowRoot);
        this.shadowRoot.onchange=console.log
    }
    observe = () => this.shadowRoot.Q('.delta,.boost', data => Form.observer.observe(data, {attributeFilter: ['value']}));
    static observer = new MutationObserver(mus => mus.forEach(({target}) => {
        if (target.classList.contains('done')) return;
        target.classList.remove('posi', 'nega');
        let value = parseFloat(target.value);
        target.classList.add('done', value > 0 ? 'posi' : value < 0 ? 'nega' : '_');
        target.value = target.title ? Stats.round({prop: target.title, value: Math.abs(value)}) : Math.abs(value).toFixed(0);
        setTimeout(() => target.classList.remove('done'));
    }))
}
