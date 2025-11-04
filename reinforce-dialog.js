class ReinforceDialog extends HTMLElement {
    constructor(rune) {
        super();
        this.attachShadow({mode: 'open'}).innerHTML = `
        <style>
        :host {
            color:var(--fg);
            user-select:none;
        }
        classic-rune {pointer-events:none;}
        #feed {
            display:grid;grid-template:auto/auto 5em auto;
            margin-top:2em;
        }
        #exp {
            grid-area:1/1/2/4;justify-self:center;
            position:relative;
            width:min(100%,30em);
            margin-bottom:1em;  
        }
        #exp::before {
            content:'Lv 'attr(title);
            position:absolute;bottom:60%;left:0;
        }
        #exp::after {
            content:attr(value)'%';
            position:absolute;bottom:60%;right:0;
        }
        progress {
            height:.5em;width:100%;
            appearance:none;
            position:absolute;left:0;
        }
        ::-webkit-progress-value {
            transition:width .25s ease-in;
            background:orange;
        }
        .linear::-webkit-progress-value {
            transition:width .25s linear;
        }
        .final::-webkit-progress-value {
            transition:width .25s ease-out;
        }
        #ds {
            grid-area:2/2/6/3;
            background:url(/rune/simulator/darkstone.webp) center / 70% no-repeat;
            display:flex;flex-direction:column;justify-content:center;align-items:center;
        }
        #ds::before {
            content:attr(title);
        }
        #ds::after {
            border-top:.1em solid;
            content:attr(value);
        }
        button {
            all:unset;
            width:min-content;
            background:var(--fg);color:var(--bg);
            padding:.1em .2em;margin:.1em 0;
        }
        button:nth-of-type(odd) {justify-self:end;}
        #go {
            grid-area:6/1/7/4;justify-self:center;
            width:11em;
        }
        #ds,#ds~* {display:none;}
        dl {display:grid;grid-template:auto / 2em 4em;width:6em;margin:auto;gap:0 .5em;}
        dl:first-of-type>* {font-size:1.5em;}
        dt,dd {margin:0;justify-self:flex-start;}
        prop-icon {vertical-align:sub;}
        </style>`;
        this.shadowRoot.append(rune.cloneNode(true),
            E('div#feed', [
                E('data#exp'),
                E('data#ds', {value: Runes.darkstone.value, title: 0}),
                ...[-1,1,-10,10,-100,100,-1000,1000].map(ds => E('button', `${ds}`.replace(/^(?!-)/, '+').replace('-', '−'), {value: ds})),
                E('button#go', 'Reinforce')
            ]),
            E('p', [E('span', 'WIP. Please use simple reinforcement mode.'), E('span', '製作中。請使用簡易強化模式。')]),
        );
        this.shadowRoot.Q('#go').onclick = () => this.stones.execute(rune);
    }
    connectedCallback() {
        this.shadowRoot.Q('button[value]', button => button.onclick = () => this.stones.add(parseInt(button.value)));
        this.rune = this.getRootNode().host.rune;
        this.feed = 0;
        this.bars = this.rune.required.map((exp, i, ar) => E('progress', {max: exp - (ar[i-1] ?? 0)}));
        this.updateHTML();
    }
    updateHTML() {
        this.shadowRoot.Q('#exp').replaceChildren(...this.bars);
        this.fill(this.rune.exp);
        this.shadowRoot.append(E('dl', [
            E('dt>prop-icon', {prop: this.rune.primary.prop}),
            E('dd', Stat.round(this.rune.primary))
        ]));
        this.shadowRoot.append(E('dl', this.rune.secondary.flatMap(s => [
            E('dt>prop-icon', {prop: s.prop, level: s.level}),
            E('dd', Stat.round(s))
        ])));
    }
    stones = {
        add: amount => {
            amount = Math.max(this.feed*-1, Math.min(amount, 1000 - this.feed, Math.ceil(this.rune.required.at(-1) - this.rune.exp - this.feed)));
            if (amount === 0) return;
            this.feed = this.shadowRoot.Q('#ds').title = this.feed + amount; //feed+amount>0, <=1000, <=Lv10-rune.exp

            let current = this.bars.findIndex(progress => progress.value < progress.max), index = 0, add;
            this.bars.forEach(progress => {
                progress.classList.remove('initial', 'linear', 'final');
                progress.style.zIndex = 0;
            });
            let animate = (bar, delta, delay) => setTimeout(() => {
                this.bars[bar].style.zIndex = delay + 1;
                this.bars[bar].value += delta;
                Object.assign(this.shadowRoot.Q('#exp'), {
                    value: (this.bars[bar].value / this.bars[bar].max * 100).toFixed(1),
                    title: bar
                });
            }, delay);
            while (amount != 0) {
                add = amount > 0;
                let delta = amount > 0 ? 
                    Math.min(amount, this.bars[current].max - this.bars[current].value) : 
                    Math.max(amount, 0 - this.bars[current].value);
                animate(current, delta, index * 250);
                this.bars[current].classList.add(index === 0 ? 'initial' : 'linear');
                current += amount / Math.abs(amount);
                amount -= delta;
                index++;
            }
            add != null && this.bars[add ? current - 1 : current + 1].classList.add('final');
            //this.fill(this.rune.exp + this.feed);
        },
        execute: rune => {
            if (this.feed === 0) return;
            this.getRootNode().host.action.feed(this.feed);
            setTimeout(() => {
                let replace = new ReinforceDialog(rune);
                this.replaceWith(replace);
                replace.getRootNode().Q('dialog').open = false;
                replace.getRootNode().Q('dialog').showModal();
            });
        }
    }
    fill(exp) {
        this.bars.forEach((progress, i) => {
            //progress.hidden = true;
            progress.value = Math.max(0, Math.min(exp, progress.max));
            progress.style.zIndex = progress.value ? i : 0;
            exp -= progress.max;
        });
        let current = this.bars.find(progress => progress.value < progress.max);
        (current ?? this.bars.at(-1)).hidden = false;
        Object.assign(this.shadowRoot.Q('#exp'), {
            value: current ? (current.value / current.max * 100).toFixed(1) : 100,
            title: current ? this.bars.indexOf(current) : 10
        });
    }
}
customElements.define("rune-reinforce", ReinforceDialog);