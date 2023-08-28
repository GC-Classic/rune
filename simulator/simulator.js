
const Observers = () => {
    new MutationObserver(([{addedNodes}]) => {
        addedNodes.forEach(li => li.firstChild?.visibility(Runes.filter()));
        Q('#inventory classic-rune.equipped', rune => rune.classList.remove('equipped'));
        Q('#count').value = Runes.inventory.children.length + Runes.equipped().length;
        addedNodes.length == 1 && Runes.sort();
    }).observe(Runes.inventory, {childList: true});

    new MutationObserver(([{addedNodes}]) => {
        Q('#inventory>li:empty', li => li.remove());
        Q('#equipped classic-rune:not(.equipped)', rune => rune.classList.add('equipped'));
        Runes.equipped([...document.querySelectorAll('#equipped classic-rune')]);
        Runes.recalculate();
        Q('#stats figure').replaceChildren(...Runes.equipped.sets.find().map(s => E('img', {src: `/rune/set/${s}.webp`})));
        Stats.update();
        DB.save.equipped();
        addedNodes.length >= 1 && Runes.sort();
    }).observe(Q('#equipped'), {childList: true, subtree: true});

    new MutationObserver(([{target}]) => 
        DB.put('meta', ['darkstone-amount', parseInt(target.value)])
    ).observe(Runes.darkstone, {attributes: true});
}
const Form = () => {
    Form.build();
    Form.events();
}
Object.assign(Form, {
    build: () => {
        Q('#filter').prepend(...E.fieldsets.radio({
            shape: [0,3,4,5,6].map(s => ({[s]: E('img', {src: `/rune/shape/${s}.webp`})}))
        }));
        Q('#filter details').append(...E.fieldsets.radio({
            tier: [1,2,3,4,5],
            grade: Rune.grade.map((g, i) => ({[i]: g})),
        }), ...E.fieldsets.checkbox({
            pri: Object.keys(Rune.secondary).filter(p => !['HS', 'GP'].includes(p)).map(p => ({[p]: E('prop-icon', {prop: p})})),
            sec: Object.keys(Rune.secondary).map(p => ({[p]: E('prop-icon', {prop: p, tips: ''})})),
            set: Rune.set.flat().map(s => ({[s]: E('img', {src: `/rune/set/${s}.webp`, alt: s})})),
        }));

        Q('#base fieldset:first-of-type').append(...['A','D','V','SA','SD','CAC','CAD','HP','MP']
            .flatMap(p => E.inputNlabel(E('prop-icon', {prop: p}), { type: 'radio', name: 'base', id: p })),
        );
        Q('#base fieldset:last-of-type').append(...Object.entries({A:15000,D:5000,V:5000,CAC:50,CAD:400,HP:30,MP:50,SA:7500,SD:500})
            .flatMap(([p, v]) => [E('input', {name: p, value: v, type: 'number'}), E('data', {classList: 'boost', title: p})])
        );
        DB.get('meta', 'character').then(stats => stats && Object.entries(stats).forEach(([p, v]) => Q(`input[name=${p}]`).value = v));
    },
    events: () => {
        Q('#filter input', input => input.onchange = () => Q('#inventory classic-rune', rune => rune.visibility(Runes.filter(true))));
        Q('#filter-reset').onclick = ev => ev.preventDefault() ?? Q('legend label', label => label.click());
        Q('#filter-text').onclick = ev => ev.preventDefault() ?? Q('#filter').classList.toggle('text');

        Q('#base input[type=radio]', input => input.onchange = () => {
            Q('.editing', input => input.classList.remove('editing'));
            Q(`input[name=${input.id}]`).classList.add('editing');
        });
        Q('#A').click();
        Q('#base input[type=number]', input => {
            input.onchange = () => {
                Runes.recalculate().sort();
                Stats.update();
                DB.put('meta', ['character', Form.base.values()]);
            };
            input.onkeydown = ev => ev.key == 'Tab' ? Q(`label[for=${input.name}]`).nextSibling?.nextSibling.click() : null;;
        });
    },
    base: {
        values: () => Q('input[type=number]').reduce((obj, input) => ({...obj, [input.name]: parseFloat(input.value)}), {})
    }
});

Object.assign(Menu, {
    action: dragged => {
        if (dragged.Q('#dismantle:checked') && dragged.Q('input[value=auto]').checked) {
            Runes.inventory.Q('li:not([hidden]) classic-rune:not(.saved)', rune => rune.action.dismantle(true));
            dragged.Q('input[value=manual]').checked = true;
        }
        Runes.inventory.Q('classic-rune[dismantle]', rune => rune.action.dismantle(true));
    },
    standard: () => Q('input[value=standard]').checked 
});

Object.assign(DB, {
    save: {
        equipped: () => DB.put('meta', ['equipped', Runes.equipped().map(rune => rune.number)]),
    },
    load: {
        runes: () => DB.getAll('runes')
            .then(runes => {
                Runes.inventory.append(...runes.map(([number, string]) => E('li', [new RuneElement(string, {classList: 'saved', number})])))
                return DB.get('meta', 'equipped');
            })
            .then(runes => {
                if (!runes) return;
                runes = runes.map(number => Q(`classic-rune[number='${number}']`));
                Runes.equipped(runes);
                runes.forEach(rune => Q(`#s-${rune.rune.shape}`).append(rune));
            }),
        darkstones: () => DB.get('meta', 'darkstone-amount')
            .then(amount => Runes.darkstone.add(amount ?? 80000))
            .then(() => DB.get('meta', 'darkstone-redeemed'))
            .then(redeemed => {
                let today = new Date();
                today = `${today.getYear()+1900}/${today.getMonth()+1}/${today.getDate()}`;
                if (!redeemed || today != redeemed && new Date(redeemed) < new Date(today)) {
                    Runes.darkstone.add(20000);
                    DB.put('meta', ['darkstone-redeemed', today]);
                }
            }),
    }
})
