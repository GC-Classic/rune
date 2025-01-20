class BuffForm extends Form {
    constructor() {
        super();
        this.shadowRoot.append(
            E('label', [
                E('a', {href: 'https://docs.google.com/spreadsheets/d/1FGxKHQuwz_Jx-GdYd6647FiAE9UbS6mZgufXor9_DZk', target: '_blank'}, [
                    E('span', 'Coefficient'), E('span', '傷害系數')
                ]),
                E('input', {type: 'number', name: 'skill', step: '0.001', placeholder: 4.55})
            ]),
            ...Object.entries(BuffForm.inputs).map(([name, span]) =>
                E('label', [...
                    span.split('|').map(t => E('span', t)),
                    E('input', {
                        type: 'number', name, 
                        step: name.includes('Lv') ? 1 : 0.01,
                        placeholder: name == 'BP' ? 30 : name.includes('Lv') ? 85 : 0
                    })
                ])
            ),
            E('section', [
                ...this.list('title', 'radio', id => `/damage/buffs/${id}.webp`),
                ...this.list('item', 'checkbox', id => `/damage/buffs/${id}.png`),
                ...this.list('rune', 'checkbox', id => `/rune/set/${id.split('-')[0]}.webp`),
            ]),
            E('div', [E('span', 'Attack buff'), E('span', '攻擊加乘')]),
            E('div', [
                E('data', {classList: 'boost percent'}), E('i', '+', {style: {fontSize: '1.5em'}}),
                E('input', {type: 'number', step: 0.01, placeholder: 0}), E('i', '%', {style: {fontSize: '1em'}})
            ]),
        );
    }
    connectedCallback() {
        super.connectedCallback();
        this.shadowRoot.Q('section').onclick = ev => {
            if (ev.target.type != 'radio') return;
            this.titled == ev.target ? this.titled = ev.target.checked = false : [this.titled = ev.target, ev.target.checked = true];            
        }
        this.shadowRoot.Q('section').onchange = ev => {
            let buffs = [this.shadowRoot.Q('input:checked') ?? []].flat().reduce((sum, input) => sum.add(JSON.parse(input.value)), new Stats(Stats.zero()));
            this.shadowRoot.Q('data').value = buffs.A;
        }
    }
    list = (name, type, src) => 
        Object.entries(BuffForm.buffs[name]).map(([id, value]) => E('label', [
            E('input', {id, type, ...type ? {name} : {}, value: JSON.stringify(value)}), 
            E('img', {src: src(id)})]
        ))
    static inputs = {
        sp: 'All skill|所有技能',
        sp13: 'Normal skill|普通技能',
        sp4: '4th skill|4 技能',
        spA: 'Awaken skill|覺醒技能',
        Attd: 'Attack / Attacked|擊/被擊',
        MonsterLv: 'Monster level|怪物等級',
        Lv: 'Character level|角色等級',
        TD: 'Taint debuff|侵蝕減益',
        BP: 'Back proportion|背擊佔比'
    }
    static buffs = {
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
}
customElements.define('buff-form', BuffForm);