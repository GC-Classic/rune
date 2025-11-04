import {Data, Stat} from '/calculation.js'
import {Menu} from '/UIX.js'
import {Rune, Runes} from './rune.js'
class RuneElement extends HTMLElement {
    constructor(rune, attr) {
        super();
        Object.assign(this, attr);
        this.hidden = true;
        this.attachShadow({mode: 'open'});
        this.createRune(rune || this.title);
        this.createHTML();
        this.updateHTML();
        //this.onclick = () => this.action[Q('input[name=action]:checked').id]();
    }
    set number(no) {this.setAttribute('number', no);}
    get number() {return this.getAttribute('number');}
    get equipped() {return Runes.equipped().includes(this);}
    get saved() {return this.classList.contains('saved');}
    createRune = rune => {
        if (!rune)
            return this.rune = new Rune();
        if (typeof rune != 'string' && rune?.constructor == Rune)
            return this.rune = rune;

        let [, shape, tier, grade, level, primary, secondary, set] = /^\[(\d)\]T(\d)(.)\+(\d+)(.+?)\((.*?)\)\{(.*?)\}$/i.exec(rune?.string || rune);
        this.rune = new Rune({
            shape: parseInt(shape), tier: parseInt(tier),
            grade: Rune.grade.indexOf(grade), set: set.toLowerCase(),
            primary: {
                prop: primary.toUpperCase(),
                level: parseInt(level)
            },
            secondary: secondary?.split(',').filter(s => s).map(s => {
                let [, prop, level] = /^(.+?)('*)$/.exec(s);
                return ({prop: prop.toUpperCase(), level: level.length});
            }) ?? [],
            exp: rune?.exp, consumed: rune?.consumed
        });
    }
    createHTML = () => {
        this.shadowRoot.append(
            E('link', {rel: 'stylesheet', href: '/common.css'}),
            E('link', {rel: 'stylesheet', href: '/rune/rune.css'}),
            E('b.tier', {title: `T${this.rune.tier}`}), 
            E(`figure.${Rune.grade[this.rune.grade]}`, [
                E('img', {src: `/rune/shape/${this.rune.shape}.webp`}),
                this.rune.set ? E('img', {src: `/rune/set/${this.rune.set}.webp`}) : '',
                E('div.top', [
                    E('b'), E('data.delta'), E('b.level')
                ]), 
                E('div.bottom', [
                    ...this.rune.acquired.map(prop => E('prop-icon', {prop}))
                ]),
            ]),
            E('dialog', E('button', 'Close 關閉', {onclick: ev => ev.target.parentElement.close()}), {
                onclick: ev => ev.stopPropagation(),
                onclose: ev => ev.target.Q('rune-reinforce').remove()
            })
        );
        Data.observe(this.shadowRoot);
    }
    updateHTML = () => Object.values(this.update).forEach(f => f());
    update = {
        pri: () => {
            this.sQ('.level').textContent = `+${this.rune.primary.level}`;
            this.rune.primary.level && this.classList.add('reinforced');
            this.title = this.rune.stringify();
        },
        sec: () => {
            this.rune.acquired.length > this.sQ('.bottom').children.length ?
                this.sQ('.bottom').append(E('prop-icon', {prop: this.rune.acquired.at(-1)})) :
                this.rune.secondary.forEach(s => this.sQ(`prop-icon[prop=${s.prop}]`).level = s.level);
            this.title = this.rune.stringify();
        },
        delta: () => {
            return;
            this.calculate.delta();
            this.sQ('.delta').value = this.delta;
        },
        score: () => {
            let score = Rune.score(this.rune.shape, ...(([pri, ...sec]) => [pri, sec])(this.rune.acquired));
            this.setAttribute('score', score);
        }
    }
    calculate = {
        delta: () => this.delta = Stat.baseNrune(Runes.equipped.replace(this)) - Stat.baseNrune()
    }
    visibility = filter => this.parentElement.hidden = !new O(filter).every(([attr, value]) => 
        value.some(v => ['pri', 'sec'].includes(attr) ? this.has[attr](v) : this.rune[attr] == v)
    )
    has = {
        pri: prop => this.rune.primary.prop == prop,
        sec: prop => this.rune.secondary.find(s => s.prop == prop)
    }
    action = {
        save: (force = false) => {
            if (!force && this.saved && this.equipped)
                return Error('unequip-unsave');
            this.classList[force ? 'add' : 'toggle']('saved');
            force || this.saved ?
                DB.put('runes', [this.number, this.rune.forSaving()]) :
                DB.delete('runes', this.number);
        },
        equip: (equip = true) => {
            if (!equip || this.equipped)
                return Runes.inventory.append(E('li', this));
            Q(`#s-${this.rune.shape} classic-rune`)?.action.equip(false);
            Q(`#s-${this.rune.shape}`).append(this);
            this.action.save(true);
        },
        dismantle: (confirm = false) => {
            if (this.saved)
                return Error('unequip-unsave');
            if (!confirm)
                return this.toggle({dismantle: this.rune.dismantle});
            Runes.darkstone.add(this.rune.dismantle);
            this.parentElement.remove();
        },
        feed: stones => {
            stones ??= Math.ceil(this.rune.required[this.rune.primary.level] - this.rune.exp);
            if (stones > Runes.darkstone.value)
                return Error('inadequate-darkstones');
            let before = this.delta;
            let bonus = this.rune.feed(stones);
            Runes.darkstone.add(stones * -1);
            this.updateHTML();
            this.equipped ? Stat.update() && Runes.recalculate() : this.delta > before && Runes.sort();
            bonus > 1 && this.toggle({bonus}, true);
            this.saved && this.action.save(true);
        },
        reinforce: () => {
            if (!Menu.standard())
                return this.rune.primary.level < 10 && this.action.feed();
            this.sQ('dialog').prepend(new ReinforceDialog(this));
            this.sQ('dialog').showModal();
        }
    }
    toggle = (obj, fade = false) => {
        clearTimeout(this.timer);
        let [attr, value] = [...new O(obj)][0];
        if (this.hasAttribute(attr))
            return this.removeAttribute(attr);
        this.setAttribute(attr, value);
        fade && (this.timer = setTimeout(() => this.removeAttribute(attr), 700));
    }
    attributeChangedCallback() {
        this.sQ('figure').title = this.rune.dismantle;
    }
    static observedAttributes = ['dismantle'];
}
customElements.define("classic-rune", RuneElement);
export default RuneElement