"""Pass 10: Charlie's review of the V2 draft (8 Nov 2026).
Team photos and awards, BRIK banner headings, forecast into the long-term view,
duplicate 'how it works' removed, Keep in touch moved below Heritage."""


def apply(s, rep):
    # ---------- developer and architect: completed-scheme photos, awards
    import os, json
    HERE = os.path.dirname(os.path.abspath(__file__))
    site = json.load(open(f"{HERE}/site.json", encoding="utf-8"))
    t0 = s.find('<div class="team2">')
    assert t0 > 0, 'team2'
    pen = '<svg class="penline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="5,1.6 95,1.6 95,97 50,88 5,97" vector-effect="non-scaling-stroke"/></svg>'
    # Banner opens the 'meet the developer / meet the architect' pair: brought to you by an award-winning team.
    aw = ('<div class="awards pennants" style="--pbg:var(--' + site.get("awards_bg", "arch1") + ')"><div class="pnhead"><div class="cap">' + site.get("awards_cap", "Brought to you by") + '</div>'
          '<h3 class="pnh">' + site.get("awards_h", "An award-winning team.") + '</h3></div><div class="pnrow">'
          + "".join(f'<div class="pennant" style="--i:{k}">{pen}<span class="pnbody">{b}</span><span class="pnstat">{st}</span>'
                    + (f'<span class="pncat">{c}</span>' if c else '') + f'<span class="pnproj">{pr}</span></div>'
                    for k, (b, st, c, pr, y) in enumerate(site["awards"]))
          + '</div>' + (f'<p class="pnnote">{site["awards_note"]}</p>' if site.get("awards_note") else '') + '</div>')
    s = s[:t0] + aw + s[t0:]

    # ---------- skin in the game: drop the three-point row under the lead
    import re as _re
    s, n = _re.subn(r'<ul class="hqlist">.*?</ul>', '', s, flags=_re.S)
    assert n == 1, ("hqlist", n)

    # ---------- BRIK banner: two clear halves
    s = rep(s, '<div class="cap bbsub">Who\'s behind BRIK</div><div class="bbtrack">',
            '<div class="bbhalf bbhead"><span class="mask plogo lg7 bbscout" aria-hidden="true"></span><div><div class="cap">Experienced property investment specialists</div><h3 class="bbh">Who\'s behind BRIK.</h3></div></div><div class="bbtrack">', label="brik second half")

    # ---------- The data: forecast moves into the long-term view in Returns
    a = s.find('\n <div class="sec"><div class="cap"><span>Future capital growth</span></div>')
    assert a > 0, "forecast block"
    z = s.find('</table></div></div>', a) + len('</table></div></div>')
    fc = s[a:z]
    s = s[:a] + s[z:]
    fc = (fc.strip()
          .replace('<div class="sec"><div class="cap"><span>Future capital growth</span></div><h3>', '<div class="fcast"><div class="cap">Future capital growth</div><h3 class="big-h">', 1))
    import re
    m = re.search(r'<section class="sec"><div class="cap"><span>The long-term view</span><span>[^<]*</span></div>', s)
    assert m, "long view"
    s = s[:m.start()] + m.group(0).replace('<section class="sec">', '<section class="sec lvsec">', 1) + fc + s[m.end():]

    # ---------- Next steps: the 'how it works' grid repeats the process above; keep the hands-off banner
    a = s.find('function howBlocks(){return `<section class="sec"><div class="cap"><span>How it works</span><span>What you\'re buying</span></div><div class="buy4">')
    assert a > 0, "howBlocks"
    b = s.find('</div>\n <div class="handsoff">', a)
    assert b > a
    s = s[:a] + 'function howBlocks(){return `<section class="sec">' + s[b + len('</div>\n '):]

    # ---------- Keep in touch: below the building's heritage, above the gallery
    s = rep(s, '+nextTab()+howBlocks()+CONTACT};', '+nextTab()+howBlocks()};', label="contact out of next")
    s = rep(s, '<div class="gsec galend" id="t-gallery" data-sec="heritage">',
            '<div class="gsec contactend" id="t-contact" data-sec="heritage">${CONTACT}</div><div class="gsec galend" id="t-gallery" data-sec="heritage">', label="contact after heritage")
    # ---------- BRIK band (9 Nov): 'Our involvement' is the headline; 'Why we chose this' moves up to the Underbanks, above the map
    s = rep(s, '<div class="cap">Our involvement</div><h3 class="bbh">Rooted in the Underbanks.</h3>',
            '<div class="cap">Rooted in the Underbanks</div><h3 class="bbh">Our involvement.</h3>', label="involvement title")
    a = s.find('<div class="bbwhy">'); assert a > 0, "bbwhy"
    z = s.find('</p></div>', a) + len('</p></div>')
    why = s[a:z].replace('<div class="bbwhy">', '<div class="bbwhy solo">', 1)
    s = s[:a] + s[z:]
    m = s.find('\n <div class="mapmode"'); assert m > 0 and s.rfind('sec locwhy', 0, m) > 0, "mapmode"
    s = s[:m] + '\n ' + why + s[m:]
    # ---------- 9 Nov: forecast table without the 2026 column; returns disclaimer line removed (Charlie's call)
    a = s.find('<table class="ftab">'); z = s.find('</table>', a)
    assert a > 0 and z > a, "ftab"
    t = s[a:z]
    assert t.count('<th>2026</th>') == 1, "ftab 2026"
    t = t.replace('<th>2026</th>', '', 1)
    t, k = _re.subn(r'(<tr[^>]*><td>[^<]+</td>)<td>[^<]*</td>', r'\1', t)
    assert k == 3, ("ftab rows", k)
    s = s[:a] + t + s[z:]
    s, k = _re.subn(r"\n\s*<p class=\"fine\">Forecasts are BRIK Studios' estimates, not guarantees\.[^<]*</p>", '', s)
    assert k == 1, ("disclaimer", k)
    # ---------- 9 Nov: no charity element in the admin fee any more
    s, k = _re.subn(r', part (?:of which goes to|donated to) charity', '', s)
    assert k >= 2, ("charity", k)
    assert 'charity' not in s.lower(), "charity left"

    # ---------- 9 Nov: reason 7 and 'Reserve your apartment' become one band, with the keyring photo
    a = s.find('<section class="hero-next">'); z = s.find('</section>', a) + len('</section>')
    assert a > 0 and z > a, "hero-next"
    hero = s[a:z]
    lead = _re.search(r'<p class="lead">(.*?)</p>', hero, _re.S).group(1)
    fig = _re.search(r'<figure class="keyfig">.*?</figure>', hero, _re.S).group(0)
    s = s[:a] + s[z:]
    resv = ('<div class="c7res"><div class="cap">How to reserve</div><p>' + lead + '</p>'
            '<div class="row"><button class="b solid" data-call>Book a 3D virtual tour</button></div></div>')
    c0 = s.find('const CASE=['); assert c0 > 0, "CASE"
    s = s[:c0] + 'const RESV=`' + resv + '`,RESFIG=`' + fig + '`;\n' + s[c0:]
    s = rep(s, '${i===CASEN-1?`<div class="row"><button class="b solid" data-call>Book a 3D virtual tour</button></div>`:""}', '${i===CASEN-1?RESV:""}', label="resv")
    s = rep(s, '<h3 class="c7h">${c[0]}</h3></div>', '<h3 class="c7h">${c[0]}</h3>${i===CASEN-1?RESFIG:""}</div>', label="resfig")
    s = rep(s, '<div class="case7 rise" id="case-${i+1}">', '<div class="case7 rise${i===CASEN-1?" c7last":""}" id="case-${i+1}">', label="c7last")
    # ---------- 9 Nov: Charlie's skin-in-the-game line
    s = s.replace("I've bought into their last building myself.", "I personally invested in their previous building.")
    # ---------- 9 Nov: specification CGIs as a left-to-right slider (less vertical space)
    a = s.find('<div class="rooms-big" style="margin-top:56px">'); assert a > 0, "rooms-big"
    z = s.find('.join("")}</div>', a); assert 0 < z - a < 3000, "rooms-big end"
    z += len('.join("")}</div>')
    arr = ('<div class="tpnav rbnav"><button class="tparr prev" aria-label="Previous image"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>'
           '<button class="tparr next" aria-label="Next image"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>')
    blk = s[a:z].replace('<div class="rooms-big" style="margin-top:56px">', '<div class="rooms-big rbtrack" tabindex="0" aria-label="Specification images, scroll sideways">', 1)
    s = s[:a] + '<div class="rbslider">' + blk + arr + '</div>' + s[z:]
    # ---------- 9 Nov: Returns before Choose your apartment, then Next steps
    s = rep(s, '["invest","Your investment",["units","returns","next"]]', '["invest","Your investment",["returns","units","next"]]', label="order groups")
    s = rep(s, '"Next: choose your apartment"]', '"Next: the returns"]', label="order gnext")
    s = rep(s, 'chh("07","Returns",', 'chh("06","Returns",', label="order returns no")
    s = rep(s, 'chh("06","Choose your apartment",', 'chh("07","Choose your apartment",', label="order units no")
    s = rep(s, '<button role="tab" data-tab="units" aria-selected="false"><span class="tn0">06</span>Choose your apartment</button><button role="tab" data-tab="returns" aria-selected="false"><span class="tn0">07</span>Returns</button>',
            '<button role="tab" data-tab="returns" aria-selected="false"><span class="tn0">06</span>Returns</button><button role="tab" data-tab="units" aria-selected="false"><span class="tn0">07</span>Choose your apartment</button>', label="order nav tabs")
    return s
