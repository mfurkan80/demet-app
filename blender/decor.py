"""Wrapping paper, ribbon, note card and small decorations.

Bouquet convention (Blender, Z up, front = -Y): stems gather at the tie point
z=TIE; the wrap cone opens upward to ~z=0.8.
"""
import math
from geo import MeshBuilder, tube, sphere, ribbon_strip, bezier_path, TAU

TIE = 0.24
R_TIE = 0.05


def cone_radius(z, flare_up=0.55, flare_down=0.3):
    if z >= TIE:
        return R_TIE + (z - TIE) * flare_up
    return R_TIE + (TIE - z) * flare_down


def wrap_layer(mb, mat, *, z_bot, z_top, points, amp, front_drop, pleats, pleat_amp, phase,
               grow=1.0, n_theta=96, n_z=26, shade_lo=0.62, rscale=1.0):
    verts, shade, uvs, faces = [], [], [], []
    for i in range(n_theta + 1):
        th = i / n_theta * TAU
        peak = (0.5 + 0.5 * math.cos(points * (th - phase))) ** 2.2
        front = max(0.0, math.cos(th + math.pi / 2)) ** 1.5  # th = -90deg is front (-Y)
        top = z_top + amp * peak - front_drop * front
        for j in range(n_z + 1):
            s = j / n_z
            z = z_bot + (top - z_bot) * s
            gather = math.exp(-((z - TIE) / 0.12) ** 2)
            pa = pleat_amp * (0.35 + 0.65 * gather)
            pleat = math.sin(pleats * th + phase * 3)
            r = cone_radius(z, flare_up=0.55 * grow) * (1 + pa * pleat) * rscale
            # soft outward roll at the top edge
            r += 0.03 * max(0.0, s - 0.8) ** 2 / 0.04
            verts.append((r * math.cos(th), r * math.sin(th), z))
            g = shade_lo + (1 - shade_lo) * min(1.0, abs(z - TIE) / 0.35)
            g *= 0.9 + 0.1 * (0.5 + 0.5 * pleat)
            shade.append(g)
            uvs.append((i / n_theta * 3, s))
    col = n_z + 1
    for i in range(n_theta):
        for j in range(n_z):
            a = i * col + j
            faces.append((a, a + col, a + col + 1, a + 1))
    mb.add(verts, faces, shade, mat, uvs=uvs)


def wrap():
    mb = MeshBuilder(["paper", "tissue"])
    wrap_layer(mb, "tissue", z_bot=0.15, z_top=0.8, points=5, amp=0.1, front_drop=0.05,
               pleats=11, pleat_amp=0.07, phase=0.35, grow=0.97, rscale=0.9)
    wrap_layer(mb, "paper", z_bot=0.1, z_top=0.7, points=3, amp=0.14, front_drop=0.16,
               pleats=8, pleat_amp=0.11, phase=1.2, grow=1.0, shade_lo=0.55, rscale=1.04)
    return mb.build("wrap")


wrap.view = dict(target=(0, 0, 0.45), dist=1.55, elev=22)


def rot_y(p, a):
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c)


def ribbon():
    mb = MeshBuilder(["ribbon"])
    w = 0.034
    rb = R_TIE * 1.2 + 0.004
    # band around the tie point
    band = [(rb * math.cos(t / 48 * TAU), rb * math.sin(t / 48 * TAU), TIE) for t in range(49)]
    ribbon_strip(mb, "ribbon", band, w, (0, 0, 1))
    front = (0, -rb - 0.008, TIE)

    def place(p):
        return (p[0] + front[0], p[1] + front[1], p[2] + front[2])

    # two loops: flattened horizontal ellipses tilted up and out
    for side in (-1, 1):
        tilt = side * -0.5
        pts, acr = [], []
        n = 40
        for k in range(n + 1):
            a = math.pi + k / n * TAU  # start at the knot
            x = side * (0.058 + 0.058 * math.cos(a))
            y = -0.026 * math.sin(a) * side
            p = rot_y((x, y, 0.0), tilt)
            pts.append(place(p))
            acr.append(rot_y((0, 0, 1), tilt))
        ribbon_strip(mb, "ribbon", pts, lambda t: w * (0.55 + 0.45 * math.sin(math.pi * t) ** 0.5),
                     lambda t, acr=acr: acr[min(len(acr) - 1, int(t * (len(acr) - 1)))])
    # tails
    for side in (-1, 1):
        path = bezier_path([(0, 0, 0), (side * 0.022, -0.01, -0.05), (side * 0.045, -0.004, -0.11),
                            (side * 0.05, 0.004, -0.15)], 8)
        ribbon_strip(mb, "ribbon", [place(p) for p in path],
                     lambda t: w * (0.6 + 0.4 * min(1, t * 3)),
                     lambda t, s=side: (math.cos(0.3 * s + t * 0.6 * s), 0.25 * math.sin(t * 2), -0.15 * s))
    sphere(mb, "ribbon", place((0, -0.002, 0)), 0.016, squash=1.25, seg=14, rings=8, shade=(0.75, 1.0))
    return mb.build("ribbon")


ribbon.view = dict(target=(0, -0.05, 0.24), dist=0.5, elev=12)


def card():
    """Note card on a florist pick. Front face (-Y) carries UV 0..1 for a text texture."""
    mb = MeshBuilder(["card", "pick"])
    tube(mb, "pick", [(0, 0.004, 0.45), (0, 0.004, 0.80)], 0.0025, sides=6)
    W, H, R = 0.15, 0.1, 0.012
    cz = 0.83
    outline = []
    for cx, cy, a0 in ((W / 2 - R, H / 2 - R, 0), (-W / 2 + R, H / 2 - R, 90),
                       (-W / 2 + R, -H / 2 + R, 180), (W / 2 - R, -H / 2 + R, 270)):
        for k in range(7):
            a = math.radians(a0 + k * 15)
            outline.append((cx + R * math.cos(a), cy + R * math.sin(a)))
    for y_off, front in ((-0.0012, True), (0.0012, False)):
        verts = [(0.0, y_off, cz)] + [(x, y_off, cz + y) for x, y in outline]
        uvs = [(0.5, 0.5)] + [((x + W / 2) / W, (y + H / 2) / H) for x, y in outline]
        if not front:
            uvs = [(0.02, 0.02)] * len(verts)
        n = len(outline)
        faces = []
        for k in range(n):
            f = (0, 1 + k, 1 + (k + 1) % n)
            faces.append(f if front else tuple(reversed(f)))
        mb.add(verts, faces, [1.0] * len(verts), "card", uvs=uvs)
    ob = mb.build("card", smooth=False)
    return ob


card.view = dict(target=(0, 0, 0.8), dist=0.45, elev=5)


def heart():
    mb = MeshBuilder(["heart"])
    n, rings, size, depth = 48, 8, 0.0022, 0.012
    outline = []
    for i in range(n):
        t = i / n * TAU
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        outline.append((x * size, (y + 2) * size))
    verts, shade, faces = [], [], []
    for side in (-1, 1):
        base = len(verts)
        for j in range(rings + 1):
            s = j / rings  # 0 center .. 1 rim
            for x, y in outline:
                bulge = depth * math.sqrt(max(0.0, 1 - s * s)) * side
                verts.append((x * s, bulge, y * s))
                shade.append(1.0 - 0.3 * s)
        for j in range(rings):
            for i in range(n):
                a = base + j * n + i
                b = base + j * n + (i + 1) % n
                f = (a, b, b + n, a + n)
                faces.append(f if side < 0 else tuple(reversed(f)))
    mb.add(verts, faces, shade, "heart")
    return mb.build("heart")


heart.view = dict(target=(0, 0, 0.0), dist=0.22, elev=10)


def butterfly():
    """Body along +Y; wings as separate objects (wingL/wingR) hinged on the body axis."""
    body = MeshBuilder(["body"])
    tube(body, "body", bezier_path([(0, -0.028, 0), (0, 0.0, 0.002), (0, 0.022, 0)], 6),
         lambda t: 0.0025 + 0.0045 * math.sin(math.pi * t) ** 0.6, sides=8)
    for s in (-1, 1):
        tube(body, "body", bezier_path([(0, 0.02, 0.001), (s * 0.008, 0.038, 0.006), (s * 0.014, 0.05, 0.01)], 4),
             0.0007, sides=4)
    body.build("butterfly")
    for side, name in ((1, "wingR"), (-1, "wingL")):
        mb = MeshBuilder(["wing"])
        nphi, rings = 48, 7
        verts, shade, faces = [(0, 0, 0)], [0.45], []
        for j in range(1, rings + 1):
            s = j / rings
            for i in range(nphi + 1):
                phi = -math.pi * 0.47 + i / nphi * math.pi * 0.94
                R = 0.05 if phi > 0 else 0.034
                lobe = 0.22 + 0.78 * abs(math.sin(2 * phi)) ** 0.55
                r = R * lobe * s
                x = side * r * math.cos(phi)
                y = r * math.sin(phi) + (0.004 if phi > 0 else -0.002)
                verts.append((x, y, 0.004 * s * s))
                g = 0.5 + 0.55 * s if s < 0.86 else 0.32
                if 0.55 < s < 0.7 and abs(math.sin(2 * phi)) > 0.75:
                    g = 1.15  # eye spot
                shade.append(min(1.2, g))
        row = nphi + 1
        for i in range(nphi):
            faces.append((0, 1 + i, 2 + i) if side > 0 else (0, 2 + i, 1 + i))
        for j in range(rings - 1):
            for i in range(nphi):
                a = 1 + j * row + i
                f = (a, a + row, a + row + 1, a + 1)
                faces.append(f if side > 0 else tuple(reversed(f)))
        mb.add(verts, faces, shade, "wing")
        mb.build(name)
    import bpy
    return bpy.data.objects["butterfly"]


butterfly.view = dict(target=(0, 0, 0.0), dist=0.22, elev=60)



def superq(mb, mat, center, size, e=0.25, seg=24, rings=14, shade=(0.7, 1.0), rot=None):
    """Rounded box (superellipsoid). size = half extents."""
    def sp(c, p):
        return math.copysign(abs(c) ** p, c)
    verts, sh, faces = [], [], []
    for j in range(rings + 1):
        th = -math.pi / 2 + math.pi * j / rings
        for i in range(seg):
            ph = -math.pi + TAU * i / seg
            x = size[0] * sp(math.cos(th), e) * sp(math.cos(ph), e)
            y = size[1] * sp(math.cos(th), e) * sp(math.sin(ph), e)
            z = size[2] * sp(math.sin(th), e)
            p = (x, y, z)
            if rot:
                p = rot(p)
            verts.append((center[0] + p[0], center[1] + p[1], center[2] + p[2]))
            sh.append(shade[0] + (shade[1] - shade[0]) * (j / rings))
    for j in range(rings):
        for i in range(seg):
            a = j * seg + i
            b = j * seg + (i + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    mb.add(verts, faces, sh, mat)


def rot_x(p, a):
    c, s = math.cos(a), math.sin(a)
    return (p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c)


def teddy():
    """Small sitting teddy bear, ~0.13 tall, facing -Y, sitting at z=0."""
    mb = MeshBuilder(["fur", "muzzle", "nose", "eye", "ribbon"])

    def fuzz(s):
        return lambda th, ph: 1 + 0.025 * math.sin(th * 23 + s) * math.sin(ph * 19 + s)

    sphere(mb, "fur", (0, 0, 0.045), 0.04, squash=1.15, seg=24, rings=16, shade=(0.6, 1.0), bump=fuzz(1))
    sphere(mb, "muzzle", (0, -0.03, 0.04), 0.022, squash=1.1, seg=16, rings=10, shade=(0.8, 1.0))  # tummy
    sphere(mb, "fur", (0, -0.004, 0.105), 0.034, squash=0.95, seg=24, rings=16, shade=(0.7, 1.0), bump=fuzz(2))
    for s in (-1, 1):
        sphere(mb, "fur", (s * 0.027, 0.0, 0.135), 0.012, squash=0.7, seg=12, rings=8, shade=(0.7, 1.0))
        sphere(mb, "muzzle", (s * 0.027, -0.005, 0.135), 0.007, squash=0.5, seg=10, rings=6)
        sphere(mb, "eye", (s * 0.012, -0.032, 0.113), 0.0045, seg=10, rings=6, shade=(0.9, 1.0))
        # arms reaching slightly forward, legs out front
        tube(mb, "fur", bezier_path([(s * 0.03, -0.005, 0.07), (s * 0.045, -0.02, 0.05), (s * 0.04, -0.035, 0.035)], 5),
             lambda t: 0.013 - 0.002 * t, sides=12, shade=(0.7, 1.0))
        sphere(mb, "fur", (s * 0.04, -0.036, 0.034), 0.012, seg=12, rings=8)
        tube(mb, "fur", [(s * 0.022, -0.01, 0.02), (s * 0.026, -0.035, 0.013), (s * 0.028, -0.05, 0.012)],
             0.014, sides=12, shade=(0.7, 1.0))
        sphere(mb, "muzzle", (s * 0.028, -0.062, 0.013), 0.011, squash=1.0, seg=12, rings=8)
    sphere(mb, "muzzle", (0, -0.03, 0.098), 0.014, squash=0.75, seg=14, rings=8, shade=(0.8, 1.0))
    sphere(mb, "nose", (0, -0.043, 0.103), 0.005, squash=0.7, seg=10, rings=6)
    # neck bow
    band = [(0.028 * math.cos(t / 32 * TAU), 0.028 * math.sin(t / 32 * TAU) - 0.003, 0.078) for t in range(33)]
    ribbon_strip(mb, "ribbon", band, 0.01, (0, 0, 1))
    for s in (-1, 1):
        sphere(mb, "ribbon", (s * 0.011, -0.03, 0.078), 0.009, squash=0.6, seg=10, rings=6)
    sphere(mb, "ribbon", (0, -0.032, 0.078), 0.005, seg=8, rings=5)
    return mb.build("teddy")


teddy.view = dict(target=(0, 0, 0.07), dist=0.32, elev=15)


def choco():
    """Gold-foil chocolate in a fluted paper cup on a florist pick; head ~z=0.86."""
    mb = MeshBuilder(["foil", "cup", "pick"])
    tube(mb, "pick", [(0, 0, 0.45), (0, 0, 0.84)], 0.0022, sides=6)
    z = 0.865

    def crinkle(th, ph):
        return 1 + 0.045 * math.sin(th * 17 + ph * 3) * math.sin(ph * 13 - th * 5) + 0.02 * math.sin(th * 41) * math.sin(ph * 37)

    sphere(mb, "foil", (0, 0, z), 0.019, squash=0.95, seg=36, rings=24, shade=(0.75, 1.0), bump=crinkle)
    # fluted cup: a short flared ring with pleats
    verts, sh, faces = [], [], []
    n, rows = 48, 4
    for j in range(rows + 1):
        v = j / rows
        for i in range(n):
            a = i / n * TAU
            r = (0.013 + 0.012 * v) * (1 + 0.06 * math.sin(a * 16))
            verts.append((r * math.cos(a), r * math.sin(a), z - 0.017 + 0.016 * v))
            sh.append(0.7 + 0.3 * v)
    for j in range(rows):
        for i in range(n):
            a = j * n + i
            b = j * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    faces.append(tuple(reversed(range(n))))
    mb.add(verts, faces, sh, "cup")
    return mb.build("choco")


choco.view = dict(target=(0, 0, 0.86), dist=0.16, elev=25)


def ringbox():
    """Open velvet ring box with a solitaire ring, ~0.06 wide, sitting at z=0, opening toward -Y."""
    mb = MeshBuilder(["velvet", "satin", "gold", "diamond"])
    superq(mb, "velvet", (0, 0, 0.013), (0.028, 0.026, 0.013), e=0.3, shade=(0.55, 1.0))
    superq(mb, "satin", (0, -0.001, 0.0255), (0.023, 0.02, 0.0025), e=0.25, shade=(0.85, 1.0))
    # ring slot cushion
    tube(mb, "satin", [(-0.018, -0.002, 0.027), (0.018, -0.002, 0.027)], 0.006, sides=14, shade=(0.8, 1.0))
    # lid: hinged at the back top edge, opened ~105 degrees
    def lid_rot(p):
        q = (p[0], p[1] + 0.026, p[2])
        q = rot_x(q, -math.radians(105))
        return (q[0], q[1], q[2])
    H = (0, 0.026, 0.026)  # hinge at the back top edge of the base
    ang = -math.radians(108)
    superq(mb, "velvet", H, (0.028, 0.026, 0.009), e=0.3, shade=(0.55, 1.0),
           rot=lambda p: rot_x((p[0], p[1] - 0.026, p[2] + 0.009), ang))
    superq(mb, "satin", H, (0.023, 0.021, 0.0015), e=0.25, shade=(0.85, 1.0),
           rot=lambda p: rot_x((p[0], p[1] - 0.026, p[2] - 0.0005), ang))
    # ring standing in the slot, facing -Y
    R, cz = 0.0105, 0.037
    loop = [(R * math.cos(t / 40 * TAU), -0.002, cz + R * math.sin(t / 40 * TAU)) for t in range(41)]
    tube(mb, "gold", loop, 0.0016, sides=10, cap_end=False, shade=(0.8, 1.0))
    # prongs + brilliant-cut stone on top
    top = (0, -0.002, cz + R + 0.0045)
    for k in range(4):
        a = k * TAU / 4 + math.pi / 4
        tube(mb, "gold", [(0, -0.002, cz + R), (math.cos(a) * 0.0035, -0.002 + math.sin(a) * 0.0035, top[2] + 0.001)],
             0.0006, sides=4)
    n = 8
    gird, crown_r, table_z = 0.0045, 0.0028, top[2] + 0.0025
    verts = [(top[0], top[1], top[2] - 0.004)]
    for i in range(n):
        a = i / n * TAU
        verts.append((gird * math.cos(a), top[1] + gird * math.sin(a), top[2]))
    for i in range(n):
        a = (i + 0.5) / n * TAU
        verts.append((crown_r * math.cos(a), top[1] + crown_r * math.sin(a), table_z))
    faces = []
    for i in range(n):
        faces.append((0, 1 + (i + 1) % n, 1 + i))
        faces.append((1 + i, 1 + (i + 1) % n, 1 + n + i))
        faces.append((1 + n + i, 1 + (i + 1) % n, 1 + n + (i + 1) % n))
    faces.append(tuple(1 + n + i for i in range(n)))
    mb.add(verts, faces, [1.0] * len(verts), "diamond")
    ob = mb.build("ringbox")
    return ob


ringbox.view = dict(target=(0, 0.005, 0.035), dist=0.2, elev=25)


ALL = {"wrap": wrap, "ribbon": ribbon, "card": card, "heart": heart, "butterfly": butterfly,
       "teddy": teddy, "choco": choco, "ringbox": ringbox}
