const Runes = {
    count: parseInt(Cookie.count) || 0,
    sets: {
        find: runes => {
            let count = runes.filter(rune => rune?.rune.set).reduce((count, rune) => ({...count, [rune.rune.set]: (count[rune.rune.set] ??= 0) + 1}), {});
            return Object.keys(count).flatMap(set => Array(Math.floor(count[set]/Rune.set.pieces[set])).fill(set));
        }
    },
    equipped: Object.assign(equipped => equipped ? Runes._equipped = equipped : Runes._equipped ??= [], {
        sets: Object.assign(sets => sets ? Runes._sets = sets : Runes._sets ??= [], {
            find: () => Runes.equipped.sets(Runes.sets.find(Runes.equipped())),
        }),
        replace: rune => [...Runes.equipped().filter(r => r.rune.shape != rune.rune.shape), rune]
    }),
    summon: () => {
        if (Q('#count').value == 100)
            return Error('clear-inventory');
        Runes.inventory.style.minHeight = Runes.inventory.clientHeight + 'px';
        let drawn = new RuneElement(null, {number: `${++Runes.count}`.padStart(5, '0')});
        Runes.inventory.append(E('li', [drawn]));
        Cookie.set('count', Runes.count);
        Runes.inventory.style.minHeight = 'auto';
    },
    recalculate: () => {
        [...document.querySelectorAll('classic-rune')].forEach(rune => rune.update.delta());
        return Runes;
    },
    sort: () => setTimeout(() => {
        let runes = [...Runes.inventory.children];
        runes.length > 1 && Runes.inventory.replaceChildren(...runes.sort((a, b) => a.firstChild.delta < b.firstChild.delta  ? 1 : a.firstChild.delta > b.firstChild.delta ? -1 : 0));
    }),
    filter: (changed = false) => {
        changed && (Runes._filter = null);
        return Runes._filter ??= [...document.querySelectorAll('fieldset>input:checked')]
            .map(input => input.id.split('-'))
            .reduce((obj, [attr, value]) => ({...obj, [attr]: [...obj[attr] ?? [], value]}), {});
    }
}

class Rune {
    constructor(data) {
        data?.constructor == Object ? Object.assign(this, data) : this.randomize(data);
        this.append();
        this.update();
    }
    randomize(shape) {
        this.shape = shape?.[0] ?? Rune.draw([0, 3, 4, 5, 6]);
        [this.tier, this.grade] = Rune.draw.tierNgrade();
        this.set = Rune.draw.set(this.tier);
        this.primary = {prop: Rune.draw.primary(this.shape), level: 0};
        this.secondary = Rune.draw.secondary(this.acquired, this.grade).map(p => ({prop: p, level: 0}));
    }
    append() {
        this.exp ??= 0, this.consumed ??= 0;
        this.required = Rune.exp(this.tier);
        this.secondary.reinforce = () => {
            let pool = this.secondary.filter(s => s.level < 2).map(s => s.prop);
            pool = Object.fromEntries(Object.entries(Rune.secondary).filter(([p]) => pool.includes(p)));
            let drawn = Rune.draw(pool);
            this.secondary.find(s => s.prop == drawn).level++;
        }
    }
    update() {
        const {primary, secondary} = Rune.values;
        this.primary.value = Rune.values.base[this.primary.prop] 
            * (1 + this.tier * primary.tier + this.grade * primary.grade)
            * (1 + this.primary.level * primary.level + (this.primary.level == 10 ? primary.level10 : 0));
        this.secondary?.forEach(s => s.value = (Rune.values.base[s.prop] + (secondary.correct[s.prop] ?? 0))
            * (1 + secondary.multiple + this.tier * secondary.tier)
            * (1 + s.level * secondary.level));
        this.stats = Object.fromEntries([
            [this.primary.prop, this.primary.value], ...this.secondary?.map(s => [s.prop, s.value]) ?? []
        ]);
    }
    get acquired() {return [this.primary.prop, ...this.secondary?.map(s => s.prop) ?? []];}
    get dismantle() {return Math.round(Rune.darkstones(this.tier, this.grade) + this.consumed * .7);}
    feed(stones) {
        this.bonus = Rune.draw(Rune.exp.bonus);
        this.consumed += stones;
        this.exp += Math.min(stones * this.bonus, this.required.at(-1) - this.exp);
        let to = this.required.findIndex(exp => this.exp < exp);
        this.reinforce(to < 0 ? 10 : to);
        return this.bonus;
    }
    reinforce(to) {
        if (to != null && this.primary.level >= to)
            return;
        this.primary.level++;
        if (this.primary.level % 3 == 0 || this.primary.level == 10)
            this.secondary.length < 3 ?
                this.secondary.push({prop: Rune.draw.secondary(this.acquired), level: 0}) :
                this.secondary.reinforce();
        this.update();
        to && this.primary.level < to && this.reinforce(to);
    }
    stringify = () => `[${this.shape}]T${this.tier}${Rune.grade[this.grade]}+${this.primary.level}${this.primary.prop}(${this.secondary.map(s => s.prop + Array(s.level).fill("'").join(''))}){${this.set || ''}}`;
    forSaving = () => ({string: this.stringify(), exp: this.exp, consumed: this.consumed});
}
Rune.draw = stuff => {
    if (stuff instanceof Array) 
        return stuff[Math.floor(Math.random()*stuff.length)];
    if (stuff instanceof Map) {
        let sum = 0, random = Math.random();
        for (const [output, prob] of stuff.entries())
            if (random < (sum += prob))
                return output;
    }
    const sum = Object.values(stuff).reduce((sum, weight) => sum += weight, 0);
    return Rune.draw(new Map(Object.entries(stuff).map(([output, weight]) => [output, weight / sum])));
}
Object.assign(Rune.draw, {
    tierNgrade: () => Rune.draw(Rune.tierNgrade),
    set: tier => Rune.draw(Rune.set.slice(0, tier).flat()),
    primary: shape => Rune.draw(Rune.primary[shape]),
    secondary: (acquired, grade) => {
        const pool = {...Rune.secondary};
        acquired.forEach(s => delete(pool[s]));
        return grade == null ? 
            Rune.draw(pool) :
            [...Array(grade)].map(_ => {
                let drawn = Rune.draw(pool);
                delete(pool[drawn]);
                return drawn;
            });
    },
});
Rune.tierNgrade = new Map([                     [[1,3],.1685],
                                  [[2,2],.165], [[2,3],.075 ],
                   [[3,1],.1625], [[3,2],.075], [[3,3],.015 ],
    [[4,0],.1625], [[4,1],.075 ], [[4,2],.015], [[4,3],.01  ],
    [[5,0],.05  ], [[5,1],.015 ], [[5,2],.01 ], [[5,3],.0015]
]);
Rune.set = Object.assign([
    ["fury", "endure", "tolerance", "will", "focus", "doom"],
    ["fight", "guard", "enhance", "shield", "expert", "javelin"],
    ["resist", "roar", "grow", "sage", "limit", "hunt"],
    ["awaken", "arena", "affinity", "recovery", "resurrect", "rage", "overcome", "punish", "protect"]
], {
    pieces: {
        fury: 2, endure: 2, tolerance: 2, fight: 2, guard: 2, enhance: 2, resist: 2, roar: 2, grow: 2, awaken: 2, arena: 2, affinity: 2,
        sage: 3, limit: 3, hunt: 3, will: 3, focus: 3, doom: 3, shield: 3, expert: 3, javelin: 3, recovery: 3, resurrect: 3, rage: 3, overcome: 3, punish: 3, protect: 3
    },
    effect: {
        doom: { CAD: 18.8 },
        grow: { EXP: 5 },
        resist: { TR: 2.5 },
        sage: { TR: 3 },
    },
    buff: {
        fury: { A: 5 },
        fight: { A: 2.5 },
        roar: { HS: 10 }
    }
});
Rune.primary = {
    0: ['A'],
    3: ['A','D','V','SA','SD'],
    4: ['A','D','V','MP','HP','TR'],
    5: ['A','D','V','CAC','CAD','TR'],
    6: ['CD','CAR','TR']
}
Rune.secondary = {
    CAC: 4, CAD: 4, MP: 4,
    A: 7, D: 7, V: 7, SA: 7, SD: 7, HP: 7, 
    CD: 9, TR: 10, CAR: 10, HS: 7, GP: 10,
}
Rune.grade = ['C','R','E','L'];
Rune.values = {
    base: {
        A: 69.15, D: 48.95, V: 37.15, TR: .552,
        SA: 61.55, CAC: .26, CAD: 2, MP: .44, HP: 1.268,
        CD: .36, CAR: .52, SD: 41.15, HS: 25, GP: .5,
    },
    primary: {
        tier: 2.75, grade: 1.5,
        level: 0.026, level10: 0.04,
    },
    secondary: {
        correct: { CAC: .0023, CAR: .0051, HP: .0071, MP: .01, CD: .0028 },
        multiple: 0.76, tier: 0.88,
        level: 0.15
    }
}
Rune.score = (shape, pri, sec) => {
    const critical = ['CAC', 'CAD'], attackish = ['A', 'SA', 'MP', 'CAC', 'CAD'];
    let score = sec.reduce((score, s) => score += (critical.includes(s) ? 2 : attackish.includes(s) ? 1 : 0), 0);
    if ((shape == 3 || shape == 4))
        score += attackish.includes(pri) ? 0 : -2;
    else if (shape == 5)
        score += critical.includes(pri) ? 1 : attackish.includes(pri) ? -1 : -3;
    return score;
}
Rune.exp = t => [...Array(11)].map((_, l) => (4.29702-.04274*l+.01116*l*l+.84155*l*l*l) * Math.pow(1.94366,t)).slice(1);
Rune.exp.bonus = {1:.89, 2:.1, 4:.01}
Rune.darkstones = (t, g) => Math.round((.028+.065*t+.031*t*t)*(18.717+14.743*g-3.39*g*g+1.121*g*g*g));
