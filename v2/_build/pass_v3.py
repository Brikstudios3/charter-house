"""V3 draft: a short 'brief' up front (urgency, the numbers, seven reasons, reviews, book a tour),
then 'Part two: the deep dive' with the full V2 report. Built only when V3=1."""
import os, json, html, re

HERE = os.path.dirname(os.path.abspath(__file__))


def take_div(s, start):
    """Return (begin, end) of the balanced <div ...>...</div> starting at index start."""
    depth, i = 0, start
    for m in re.finditer(r'<div\b|</div>', s[start:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0:
            return start, start + m.end()
    raise ValueError("unbalanced div")


def apply(s, rep):
    site = json.load(open(f"{HERE}/site.json", encoding="utf-8"))
    u = site["urgency"]; e = lambda x: html.escape(x, quote=False)
    # the headline numbers move from the overview chapter into the brief
    a = s.find('<div class="kpis">', s.find('CH.overview=()=>`'))
    a, b = take_div(s, a)
    kpis = s[a:b]
    s = s[:a] + s[b:]
    # the seven-step map, film and reviews: map and reviews move to the brief; film stays in the deep dive
    n0 = s.count('FILM+HOWREAD+CASEMAP+JUMP')
    assert n0 >= 1, "v3 overview hook"
    s = s.replace('${id==="overview"?FILM+HOWREAD+CASEMAP+JUMP:""}', '${id==="overview"?FILM:""}')
    s = s.replace('(id==="overview"?FILM+HOWREAD+CASEMAP+JUMP:"")', '(id==="overview"?FILM:"")')
    s = rep(s, '+nextTab()+howBlocks()+TP+FAQ};', '+nextTab()+howBlocks()+FAQ};', label="v3 reviews out of next")
    wa = re.search(r'encodeURIComponent\("Hi [^"]*3D video tour\?"\)', s).group(0)
    stats = "".join(f'<div><b>{e(v)}</b><span>{e(l)}</span></div>' for v, l in u["stats"])
    brief = (
        '<section class="brief">'
        '<div class="partlab"><span class="pno">Part one</span><span class="pnm">The brief</span><span class="ptime">2-minute read</span></div>'
        f'<div class="urgent"><div class="cap">{e(u["cap"])}</div><h2 class="urh">{e(u["h"])}</h2><div class="urstats">{stats}</div>'
        f'<p>{e(u["p"])}</p><div class="row"><button class="b solid" data-call>Book a 3D virtual tour</button>'
        '<a class="b line" href="${WA_}${' + wa + '}" target="_blank" rel="noopener">WhatsApp me</a></div></div>'
        '${HOWREAD}'
        '<div class="bknums"><div class="bkh"><div class="cap">The numbers</div><h3 class="bkt">On the example one bed.</h3></div>' + kpis + '</div>'
        '${CASEMAP}'
        '${TP}'
        '<div class="bktour"><button class="bkimg" data-img="model3d" data-cap="' + e(site["name"]) + ', from our 3D model" aria-label="View the 3D model still"></button>'
        '<div><h3 class="bkt">See it in 3D, then choose yours.</h3><p>A 30-minute video call round our 3D model of the finished building: every floor, the apartments still available and the views from each.</p>'
        '<div class="row"><button class="b solid" data-call>Book a 3D virtual tour</button></div></div></div>'
        '<div class="partlab deep" id="deepdive"><span class="pno">Part two</span><span class="pnm">The deep dive</span><span class="ptime">The full report, chapter by chapter</span></div>'
        '<div class="ddlist">${GROUPS.filter(g=>g[0]!=="brief").flatMap(g=>g[2]).map((id,k)=>`<button data-goto="${id}"><span>${String(k+1).padStart(2,"0")}</span>${TABS[id]}</button>`).join("")}</div>'
        '</section>')
    defs = "const BRIEF=()=>`" + brief + "`;\n"
    s = rep(s, "const CH={};", defs + "const CH={};", label="v3 brief def")
    s = rep(s, 'const GROUPS=[["opportunity"', 'const GROUPS=[["brief","The brief",["brief"]],["opportunity"', label="v3 groups")
    s = rep(s, 'const T={overview:CH.overview,', 'const T={brief:BRIEF,overview:CH.overview,', label="v3 T")
    s = rep(s, 'const TABS={overview:"Investment overview",', 'const TABS={brief:"The brief",overview:"Investment overview",', label="v3 TABS")
    s = rep(s, 'const S={tab:"overview",', 'const S={tab:"brief",', label="v3 S")
    s = rep(s, '<div class="tg on" data-g="opportunity">',
            '<div class="tg on" data-g="brief"><button class="tgl" data-group="brief">The brief</button><div class="tgb"><button role="tab" data-tab="brief" aria-selected="true"><span class="tn0">★</span>The brief</button></div></div><div class="tg" data-g="opportunity">', label="v3 nav")
    s = s.replace('<button role="tab" data-tab="overview" aria-selected="true">', '<button role="tab" data-tab="overview" aria-selected="false">', 1)
    return s
