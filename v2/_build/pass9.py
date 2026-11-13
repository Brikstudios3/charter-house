"""Pass 9: the sales story, press logos, rental market appraisal, simpler 3D-tour prompt,
process carousel, references at the end. Applied to the page source after the earlier passes."""


def cut(s, start_marker, end_marker, label, include_end=True):
    a = s.find(start_marker)
    assert a >= 0, f"[{label}] start not found"
    b = s.find(end_marker, a)
    assert b > a, f"[{label}] end not found"
    b = b + len(end_marker) if include_end else b
    return s[:a] + s[b:], s[a:b]


def apply(s, rep):
    # ---------- order: Why Stockport before Location, so the story runs town first, then the Underbanks
    s = rep(s, '["intel","Location and intel",["location","stockport","data"]]', '["intel","Location and intel",["stockport","location","data"]]', label="intel order")

    # ---------- the case for Charter House: seven steps, shown as banners down the page
    import os, json
    HERE = os.path.dirname(os.path.abspath(__file__))
    site = json.load(open(f"{HERE}/site.json", encoding="utf-8"))
    case_js = open(f"{HERE}/case.js", encoding="utf-8").read()
    s = rep(s, "const CH={};", case_js + "const CH={};", label="case defs")
    s = s.replace('${id==="overview"?JUMP:""}', '${id==="overview"?CASEMAP+JUMP:""}')
    s = s.replace('(id==="overview"?JUMP:"")', '(id==="overview"?CASEMAP+JUMP:"")')

    # ---------- press: a montage of newspaper cuttings, real mastheads, overlapping like stickers
    a = s.find('<div class="sec"><div class="cap"><span>In the press</span></div><div class="press">')
    z = s.find('<div class="sec"><div class="cap"><span>Employment in Stockport</span>', a)
    assert 0 < a < z, (a, z)
    CL = [
        ("timeout", "Time Out", "Why Underbanks and Central Stockport is one of the UK\'s coolest neighbourhoods for 2026", "The UK\'s coolest neighbourhoods, 2026", "hero"),
        ("st", "The Sunday Times", "Stockport, Greater Manchester, named best place to live in the northwest of England", "Best Places to Live 2024", ""),
        ("ft", "Financial Times", "Stockport offers Britain\'s towns a blueprint for revival", "", ""),
        ("tg", "The Telegraph", "How Britain\'s latest foodie destination emerged from Pizza Hut and retail parks", "", ""),
        ("men", "Manchester Evening News", "This is Stockport\'s Northern Quarter: people are moving here from Manchester", "", ""),
        ("ind", "The Independent", "Best places in UK to live in 2026 revealed", "Stockport on the list", ""),
        ("tfgm", "Transport for Greater Manchester", "State-of-the-art Stockport Interchange wins prestigious national transport award", "", ""),
    ]
    clips = "".join(
        f'<figure class="clip c{i+1} {extra}"><div class="cmast"><i class="plg {cls}" role="img" aria-label="{name}"></i></div>'
        f'{f"<div class=cnote>{note}</div>" if note else ""}<blockquote class="chl">{hl}</blockquote>'
        f'<div class="cbody" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>'
        f'{"<span class=sticker><b>No. 4</b><small>UK\'s coolest neighbourhood</small><em>Time Out 2026</em></span>" if extra == "hero" else ""}</figure>'
        for i, (cls, name, hl, note, extra) in enumerate(CL))
    s = s[:a] + ('<div class="sec pressec"><div class="cap"><span>In the press</span><span>What the papers are saying</span></div>'
                 '<div class="montage">' + clips + '</div></div>') + s[z:]

    # ---------- employment: these jobs are in Stockport itself
    s = rep(s, '<h3 class="big-h" style="margin-bottom:24px">Big employers, a short commute away.</h3>',
            '<h3 class="big-h" style="margin-bottom:14px">Big employers on the doorstep.</h3>'
            '<p class="lead empl">These aren\'t jobs at the end of a commute into Manchester. They\'re here in Stockport, most within a few miles of the town centre, '
            'and the town\'s office district is growing fast. In 2026 Vitality moved more than 1,000 staff into the new 3 Stockport Exchange, next to the station, '
            'and 4 Stockport Exchange has planning for another 60,000 sq ft of Grade A offices. '
            '<a href="https://www.stockport.gov.uk/news/vitality-opens-new-stockport-exchange-office-reinforcing-town-centres-growing-business-district" target="_blank" rel="noopener">Stockport Council, August 2026</a></p>',
            label="employment heading")
    s = rep(s, '<b data-count="800" data-comma="1" data-suf="">800</b><span class="en">Vitality Health</span><small>Health insurance, 1,000 jobs added</small>',
            '<b data-count="1000" data-comma="1" data-suf="+">1,000+</b><span class="en">Vitality Health</span><small>3 Stockport Exchange, opened 2026</small>', label="vitality")

    # ---------- Why Stockport, re-ordered to tell the story: the place, why the money, the scale
    a = s.find('CH.stockport=()=>`')
    z = s.find('</section>`;', a) + len('</section>`;')
    t = s[a:z]
    mk = lambda m: t.find(m)
    b_ = mk('\n <div class="bigstat">')
    c_ = mk('\n <div class="duo w"><button class="pic tall2" style="background-image:var(--t_station)')
    d_ = mk('\n <div class="sec"><div class="cap"><span>The North West\'s new transport hub</span>')
    e_ = mk('\n <div class="sec"><div class="cap"><span>Retail, office and leisure</span>')
    f_ = mk('\n <div class="sec pressec">')
    g_ = mk('<div class="sec"><div class="cap"><span>Employment in Stockport</span>')
    h_ = t.rfind('</section>`;')
    assert 0 < b_ < c_ < d_ < e_ < f_ < g_ < h_, (b_, c_, d_, e_, f_, g_, h_)
    A, B, C, D, E, F, G, tail = t[:b_], t[b_:c_], t[c_:d_], t[d_:e_], t[e_:f_], t[f_:g_], t[g_:h_], t[h_:]
    B = B.replace('<div class="bigstat">', '<div class="bigstat">${caseTag(2)}', 1)
    B = B.replace('<div class="cap">The UK\'s largest town-centre regeneration</div>', '<h3 class="c7h">The UK\'s largest town-centre regeneration.</h3>', 1)
    t2 = A + '\n ${caseBand(0)}' + F + '\n ${caseBand(1)}' + C + D + B + E + '\n ' + G + tail
    s = s[:a] + t2 + s[z:]

    # ---------- Location: the Underbanks step
    import re
    hook = re.search(r'\$\{chh\("\d\d","Location","[^"]*"\)\}\n', s).group(0)
    assert s.count(hook) == 1, s.count(hook)
    s = s.replace(hook, hook + ' ${caseBand(3)}\n', 1)

    # ---------- "gone deep on one neighbourhood" leaves the building chapter; its point joins the BRIK banner
    s, _ = cut(s, '\n <div class="duo w" style="margin-top:56px"><div><div class="cap" style="margin-bottom:14px">Exclusive to BRIK Studios</div>',
               '${IMG("under","The Underbanks","pic tall2")}</div>', "gone deep")

    # ---------- The data: the scarcity step; demographics move to Returns; references move to the end
    s = rep(s, '${chh("05","The data","The underlying numbers on Stockport\'s property market.")}',
            '${chh("05","The data","The underlying numbers on Stockport\'s property market.")}\n ${caseBand(4)}', label="data case")
    s, demog = cut(s, '\n <div class="sec"><div class="cap"><span>Young professional tenant demographic</span></div>',
                   '\n <div class="sec"><div class="cap"><span>The growth of Stockport</span>', "demog", include_end=False)
    demog = (demog.strip()
             .replace('<span>Young professional tenant demographic</span>', '<span>Who\'s moving in</span><span>Young professional tenant demographic</span>', 1)
             .replace('<div class="dgrid three">', '<div class="dgrid three demog">', 1))
    s, refs = cut(s, '\n <div class="sec"><div class="cap"><span>References and sources</span></div><ul class="refs">', '</ul></div>', "refs")
    refs_js = 'const REFS=`<section class="ch refsch"><div class="rfhead"><div class="cap">Further reading</div><h3 class="rfh">References and sources</h3></div>' + refs.strip().replace('<div class="sec"><div class="cap"><span>References and sources</span></div>', '<div class="sec rfsec">', 1) + '</section>`;\n'
    s = rep(s, 'function renderMain(){', refs_js + 'function renderMain(){', label="refs def")
    s = rep(s, '<div class="gsec galend" id="t-gallery" data-sec="next">${galleryTab()}</div>',
            '<div class="gsec galend" id="t-gallery" data-sec="heritage">${galleryTab()}</div><div class="gsec refsend" id="t-refs" data-sec="heritage">${REFS}</div>', label="refs at end")

    # growth figures as a full-width banner, the chart beneath
    s = rep(s, '<div class="sec"><div class="cap"><span>The growth of Stockport</span></div><div class="duo w"><div><div class="growth">',
            '<div class="sec growsec"><div class="growwrap"><div class="growband"><div class="cap"><span>The growth of Stockport</span><span>Average house prices</span></div><div class="growth">', label="growth band")
    s = rep(s, '<p class="muted" style="margin-top:18px">Short-term momentum', '<p class="gbp">Short-term momentum', label="growth para")

    # ---------- Returns: the returns step, then a rental market appraisal (rents, tenants, demographics)
    s = rep(s, '")+returnsTab()+longView()', '")+caseBand(5)+returnsTab()+longView()', label="returns case")
    rm = '<section class="sec"><div class="cap"><span>The rental market</span><span>Proven rents next door</span></div>'
    s = rep(s, rm, '<div class="rentmkt"><div class="rmhead"><div class="cap">Rental market appraisal</div><h3 class="rmh">Who rents here, and what they pay.</h3>'
                   '<p>Proven rents next door, the tenant profile, and how the area\'s population is changing.</p></div>' + rm, label="rentmkt open")
    g = s.find('<section class="sec"><div class="cap"><span>Stockport\'s growth</span>')
    assert g > 0
    ge = s.find('</section>', g) + len('</section>')
    s = s[:g] + demog + '</div>' + s[ge:]

    # ---------- who's behind BRIK: track record inside the green banner
    brands_end = s.find('</div></div></section>`;', s.find('class="sec brikband"'))
    assert brands_end > 0
    track = ('<div class="cap bbsub">Who\'s behind BRIK</div><div class="bbtrack">'
             '<div class="bbt"><b>Master agents on major schemes</b><p>Before BRIK, our founders James Dempsey and Charlie Baxter spent years at a large multinational property investment business, as master agent delivering dozens of high-profile 250-plus-apartment schemes in Manchester city centre, Birmingham and London, including some of Manchester\'s best-known towers.</p></div>'
             '<div class="bbt"><b>12 years in Hong Kong</b><p>James was group sales director in Hong Kong for 12 years, one of the early pioneers bringing investors from Hong Kong, China and Singapore into the UK market.</p></div>'
             '<div class="bbt"><b>£200m-plus commercial deals</b><p>We\'ve worked on commercial and hotel deals for funds and pension funds, and we work closely with Stockport Council, with a real voice in the town and the Underbanks in particular.</p></div>'
             '</div><div class="bbwhy"><div class="cap">Why we chose this</div><p>We\'ve chosen commuter towns because that\'s where the returns are, as demand spills out of Manchester the way it spilled out of London into towns like Croydon. And we choose boutique, low-supply heritage buildings with low service charges, because they perform better. It\'s what industry insiders, ourselves included, buy for their own portfolios, rather than mass-marketed buy-to-let.</p></div>')
    s = s[:brands_end] + '</div>' + track + s[brands_end + len('</div>'):]
    s = rep(s, '<div class="jsig"><b>James Dempsey</b><span>CEO, BRIK Studios</span></div>',
            '<div class="jsig"><b>James Dempsey</b><span>CEO, BRIK Studios. Previously group sales director in Hong Kong for 12 years</span></div>', label="james sig")
    if '<li><b>10 years in property</b><span>with a personal property portfolio in Stockport, including an apartment at Albion House</span></li>' in s:
        s = s.replace('<li><b>10 years in property</b><span>with a personal property portfolio in Stockport, including an apartment at Albion House</span></li>',
                      '<li><b>10 years in property</b><span>with a personal property portfolio in Stockport, including an apartment at Albion House</span></li>'
                      '<li><b>Master agent on major schemes</b><span>dozens of 250-plus-apartment schemes in Manchester, Birmingham and London before co-founding BRIK</span></li>', 1)

    # ---------- Next steps: the last step
    s = rep(s, '+nextTab()+howBlocks()+CONTACT', '+caseBand(6)+nextTab()+howBlocks()+CONTACT', label="next case")

    # ---------- Choose your apartment: just the prompt, with a look at the 3D model
    a = s.find('function chooseTab(){')
    z = s.find('const EARLY=`', a)
    ze = s.find('`;', z) + 2
    assert 0 < a < z < ze
    choose = r'''function chooseTab(){return `<div class="pane"><section class="sec first tourcta"><button class="tourimg" data-img="model3d" data-cap="Charter House, from our 3D model" aria-label="View the 3D model still full screen"><span class="tbadge"><i></i>Live on the call</span></button>
  <div class="tctxt"><div class="cap"><span>3D virtual tour</span><span>30 minutes on Teams</span></div>
  <h2 class="big-h">See it in 3D, then choose yours.</h2>
  <p class="lead">Jump on a short video call and I'll take you round our 3D model of the finished building: every floor, the apartments still available, and the views from each.</p>
  <div class="ctaline"><button class="b solid" data-call>Book a 3D virtual tour</button><a class="b line" href="${WA_}${encodeURIComponent("Hi Charlie, I've been looking at Charter House. Could we set up a 3D video tour?")}" target="_blank" rel="noopener">WhatsApp me</a></div>
  <p class="fine">30 minutes on Microsoft Teams, at a time that suits you. No obligation.</p></div></section></div>`}
const EARLY=`''' + site["early_html"] + "`;"
    import re as _re
    wa = _re.search(r'encodeURIComponent\("Hi [^"]*3D video tour\?"\)', s[a:ze])
    assert wa, "whatsapp text"
    choose = choose.replace('data-cap="Charter House, from our 3D model"', 'data-cap="' + site.get("name", "Charter House") + ', from our 3D model"')
    choose = choose.replace('encodeURIComponent("Hi Charlie, I\'ve been looking at Charter House. Could we set up a 3D video tour?")', wa.group(0))
    s = s[:a] + choose + s[ze:]
    s = rep(s, '<span class="plt">Early access to the top-floor apartments, before Charter House goes public.</span>',
            '<span class="plt">You\'re early: Charter House isn\'t on the open market yet.</span>', label="prelaunch strip")

    # ---------- the process: a carousel with arrows, the current step large in the middle
    a = s.find('<ol class="proc">')
    z = s.find('</ol></section>', a)
    assert 0 < a < z
    s = (s[:a] + '<div class="pcar" data-cur="${cur}"><div class="pcview"><ol class="proc">' + s[a + len('<ol class="proc">'):z]
         + '</ol></div><div class="pcnav"><button class="pcarb" data-pcar="-1" aria-label="Previous step"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>'
           '<span class="pccount" aria-live="polite"><b>1</b> of ${STEPS.length}</span>'
           '<button class="pcarb" data-pcar="1" aria-label="Next step"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div></div></section>'
         + s[z + len('</ol></section>'):])
    s = s.replace('<span> Top-floor apartments from £193,000. Choose yours on a 3D video tour.</span>', '<span> You\'re early. Choose yours on a 3D virtual tour.</span>')
    return s
