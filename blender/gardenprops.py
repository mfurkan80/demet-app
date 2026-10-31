"""Garden set pieces for the couple's garden: blossom tree, bench for two, rose arch,
lantern post, bushes, stepping stones and a ground-cover leaf clump.

Convention: Blender Z up, front faces -Y (toward the default web camera), 1 unit ~ 1 m,
garden flowers stand ~0.7 tall. Material slot names are recolored in the web app.
"""
import math
import random
from geo import MeshBuilder, tube, sphere, bezier_path, TAU, v_add, v_mul, v_norm, v_sub, v_cross
from decor import superq


def lumpy(seed, a=0.1, b=0.05):
    r = random.Random(seed)
    p = [r.uniform(0, TAU) for _ in range(4)]
    return lambda th, ph: 1 + a * math.sin(th * 3 + p[0]) * math.sin(ph * 4 + p[1]) + b * math.sin(th * 7 + p[2]) * math.sin(ph * 6 + p[3])


def tint(base, seed, amt=0.08):
    r = random.Random(seed)
    k = 1 + r.uniform(-amt, amt)
    return tuple(min(1.0, c * k) for c in base)


def cluster(mb, mat, c, R, seed, n=9, shade=(0.55, 1.0), col=None, squash=0.8, seg=14, rings=9):
    """Cauliflower-style canopy blob: a core with smaller lobes on its surface."""
    r = random.Random(seed)

    def sh(lo, hi):
        if col is None:
            return (lo, hi)
        return (lo, hi)

    start = len(mb.verts)
    sphere(mb, mat, c, R, squash=squash, seg=seg + 4, rings=rings + 2, shade=shade, bump=lumpy(seed))
    for i in range(n):
        th = math.acos(r.uniform(-0.35, 1.0))
        ph = r.uniform(0, TAU)
        d = (math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th) * squash)
        rr = R * r.uniform(0.42, 0.62)
        p = v_add(c, v_mul(d, R * 0.78))
        sphere(mb, mat, p, rr, squash=0.85, seg=seg, rings=rings, shade=shade, bump=lumpy(seed * 31 + i, 0.08, 0.04))
    if col is not None:
        for i in range(start, len(mb.verts)):
            g = mb.shade[i]
            g = g if not isinstance(g, tuple) else g[0]
            mb.shade[i] = tuple(min(1.0, g * k) for k in col)


# ------------------------------------------------------------------ tree
def tree():
    """Blossoming cherry tree, ~3.3 tall, wide umbrella canopy (radius ~1.5)."""
    mb = MeshBuilder(["bark", "blossom"])
    r = random.Random(7)
    trunk = bezier_path([(0, 0, -0.05), (0.05, 0.0, 0.55), (-0.06, 0.03, 1.05), (0.02, -0.02, 1.5)], 8)
    tube(mb, "bark", trunk, lambda t: 0.16 * (1 - 0.4 * t) + 0.17 * math.exp(-t * 12), sides=18, shade=(0.45, 0.95), up_hint=(1, 0, 0))
    for i in range(6):
        a = i / 6 * TAU + 0.3
        path = bezier_path([(0.1 * math.cos(a), 0.1 * math.sin(a), 0.25), (0.26 * math.cos(a), 0.26 * math.sin(a), 0.05),
                            (0.42 * math.cos(a + 0.15), 0.42 * math.sin(a + 0.15), -0.03)], 6)
        tube(mb, "bark", path, lambda t: 0.07 * (1 - 0.8 * t) + 0.01, sides=8, shade=(0.4, 0.8))
    # canopy lobes on a flattened dome
    centers = []
    golden = math.pi * (3 - math.sqrt(5))
    N = 24
    for k in range(N):
        y = 1 - (k + 0.5) / N * 1.25          # skip the bottom of the sphere
        rad = math.sqrt(max(0.0, 1 - y * y))
        a = k * golden
        c = (1.35 * rad * math.cos(a), 1.35 * rad * math.sin(a), 2.25 + 0.75 * y)
        centers.append(c)
    # branches reach toward the lower ring of lobes
    for k, c in enumerate(sorted(centers, key=lambda c: c[2])[:8]):
        z0 = 1.3 + 0.05 * (k % 4)
        p0 = (0.0, 0.0, z0)
        mid = (c[0] * 0.45, c[1] * 0.45, z0 + 0.45)
        tube(mb, "bark", bezier_path([p0, mid, (c[0] * 0.85, c[1] * 0.85, c[2] - 0.1)], 8),
             lambda t: 0.08 * (1 - 0.75 * t) + 0.012, sides=10, shade=(0.5, 0.95))
    tube(mb, "bark", bezier_path([(0.02, -0.02, 1.45), (0.0, 0.05, 2.1), (0.05, 0.0, 2.6)], 6), lambda t: 0.09 * (1 - 0.7 * t) + 0.01, sides=10)
    shades = [(1.0, 0.93, 0.96), (1.0, 0.86, 0.92), (0.97, 0.8, 0.88), (1.0, 0.97, 0.98)]
    for k, c in enumerate(centers):
        R = r.uniform(0.42, 0.55)
        cluster(mb, "blossom", c, R, 100 + k, n=7, shade=(0.6, 1.0), col=shades[r.randrange(4)], seg=11, rings=7)
    cluster(mb, "blossom", (0, 0, 2.35), 0.9, 99, n=6, shade=(0.6, 1.0), seg=12, rings=8)
    return mb.build("tree")


tree.view = dict(target=(0, 0, 1.55), dist=7.5, elev=12)


# ------------------------------------------------------------------ bench
def bench(L=0.66, name="bench"):
    """Garden bench (L=0.66: for two, 1.3 wide; L=0.3: single chair), seat at 0.44, facing -Y."""
    mb = MeshBuilder(["wood", "metal"])
    LX = L - 0.1
    for i in range(4):
        y = -0.17 + i * 0.112
        superq(mb, "wood", (0, y, 0.44), (L, 0.047, 0.018), e=0.18, seg=20, rings=10, shade=(0.62, 1.0))
    # backrest slats, leaning back ~14deg
    lean = math.radians(14)
    for i in range(3):
        z = 0.58 + i * 0.12
        y = 0.2 + (z - 0.5) * math.tan(lean)

        def rot(p, a=lean):
            c, s = math.cos(a), math.sin(a)
            return (p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c)
        superq(mb, "wood", (0, y, z), (L, 0.016, 0.045), e=0.18, seg=20, rings=10, shade=(0.62, 1.0), rot=rot)
    for s in (-1, 1):
        x = s * LX
        # back leg rising into the backrest
        back = bezier_path([(x, 0.16, 0.0), (x, 0.19, 0.43), (x, 0.24, 0.66), (x, 0.3, 0.92)], 6)
        tube(mb, "metal", back, 0.02, sides=10, shade=(0.6, 1.0))
        # front leg with a little scroll at the foot
        front = bezier_path([(x, -0.24, 0.0), (x, -0.2, 0.2), (x, -0.21, 0.42), (x, -0.25, 0.62)], 6)
        tube(mb, "metal", front, 0.02, sides=10, shade=(0.6, 1.0))
        # armrest
        arm = bezier_path([(x, 0.22, 0.64), (x, 0.0, 0.66), (x, -0.22, 0.65), (x, -0.29, 0.6)], 8)
        tube(mb, "metal", arm, 0.022, sides=10, shade=(0.65, 1.0))
        # seat rail and stretcher
        tube(mb, "metal", [(x, -0.22, 0.41), (x, 0.19, 0.41)], 0.016, sides=8, shade=(0.6, 0.9))
        tube(mb, "metal", [(x, -0.22, 0.12), (x, 0.17, 0.12)], 0.012, sides=8, shade=(0.5, 0.8))
        # decorative scroll under the arm
        sc = [(x, -0.2 + 0.07 * math.cos(t / 10 * TAU * 0.85), 0.52 + 0.05 * math.sin(t / 10 * TAU * 0.85)) for t in range(11)]
        tube(mb, "metal", sc, 0.008, sides=6, shade=(0.6, 0.9))
        for fy in (-0.24, 0.16):
            sphere(mb, "metal", (x, fy, 0.012), 0.03, squash=0.45, seg=10, rings=6)
    tube(mb, "metal", [(-LX, 0.0, 0.12), (LX, 0.0, 0.12)], 0.011, sides=8, shade=(0.5, 0.8))
    return mb.build(name)


bench.view = dict(target=(0, 0, 0.45), dist=2.6, elev=18)


def chair():
    return bench(0.31, "chair")


chair.view = dict(target=(0, 0, 0.45), dist=1.8, elev=18)


# ------------------------------------------------------------------ rose arch
def arch():
    """Painted arbor 1.3 wide, 2.25 tall, wrapped in climbing roses; path runs along Y."""
    mb = MeshBuilder(["paint", "stem", "leaf", "climb"])
    r = random.Random(11)
    W, Hp, D = 0.62, 1.6, 0.16
    for s in (-1, 1):
        for dy in (-D, D):
            tube(mb, "paint", [(s * W, dy, 0), (s * W, dy, Hp)], 0.03, sides=8, shade=(0.7, 1.0))
        for k in range(7):
            z = 0.15 + k * 0.22
            tube(mb, "paint", [(s * W, -D, z), (s * W, D, z)], 0.012, sides=6, shade=(0.75, 1.0), cap_end=True)
            # lattice diagonals
            if k < 6:
                tube(mb, "paint", [(s * W, -D, z), (s * W, D, z + 0.22)], 0.007, sides=5, shade=(0.75, 1.0))
    arc_pts = lambda dy: [(W * math.cos(a / 24 * math.pi), dy, Hp + W * 0.95 * math.sin(a / 24 * math.pi)) for a in range(25)]
    for dy in (-D, D):
        tube(mb, "paint", arc_pts(dy), 0.03, sides=8, shade=(0.75, 1.0))
    for a in range(1, 12):
        ang = a / 12 * math.pi
        p = (W * math.cos(ang), 0, Hp + W * 0.95 * math.sin(ang))
        tube(mb, "paint", [(p[0], -D, p[2]), (p[0], D, p[2])], 0.011, sides=6, shade=(0.75, 1.0))
    # vines: wander up each side and over the top
    def vine_path(seed, side):
        rr = random.Random(seed)
        pts = []
        for k in range(10):
            z = k / 9 * Hp
            pts.append((side * (W + rr.uniform(-0.05, 0.06)), rr.uniform(-D * 1.2, D * 1.2), z))
        for k in range(1, 9):
            ang = (k / 9) * (math.pi / 2)
            ang = math.pi / 2 - ang if side > 0 else math.pi / 2 + ang
            pts.append((W * math.cos(ang) * 1.02, rr.uniform(-D, D), Hp + W * 0.95 * math.sin(ang) + rr.uniform(-0.03, 0.05)))
        return bezier_path(pts, 4)
    roses = []
    for side in (-1, 1):
        for v in range(2):
            path = vine_path(40 + side * 7 + v, side)
            tube(mb, "stem", path, 0.01, sides=5, shade=(0.6, 0.9))
            for k in range(0, len(path), 1):
                p = path[k]
                # leaves: small double-sided ovals
                for j in range(2):
                    ang = r.uniform(0, TAU)
                    d = (math.cos(ang), math.sin(ang), r.uniform(-0.3, 0.6))
                    leaf(mb, p, v_norm(d), r.uniform(0.07, 0.11), r.uniform(0.035, 0.055))
                if k % 2 == 0 and r.random() < 0.55:
                    roses.append(v_add(p, (r.uniform(-0.03, 0.03), r.uniform(-0.05, 0.05), r.uniform(-0.02, 0.03))))
    for k, p in enumerate(roses):
        climbing_rose(mb, p, r.uniform(0.05, 0.07), k)
    return mb.build("arch")


arch.view = dict(target=(0, 0, 1.1), dist=4.2, elev=10)


def leaf(mb, base, d, L, Wd, mat="leaf"):
    """Flat pointed leaf from base along d."""
    side = v_norm(v_cross(d, (0, 0, 1)) if abs(d[2]) < 0.95 else v_cross(d, (1, 0, 0)))
    up = v_norm(v_cross(side, d))
    verts, sh = [base], [0.65]
    n = 5
    for i in range(1, n):
        t = i / n
        w = Wd * math.sin(math.pi * t) ** 0.8
        c = v_add(base, v_add(v_mul(d, L * t), v_mul(up, 0.25 * Wd * math.sin(math.pi * t))))
        verts.append(v_add(c, v_mul(side, w)))
        verts.append(v_add(c, v_mul(side, -w)))
        sh += [0.85 + 0.15 * t, 0.85 + 0.15 * t]
    verts.append(v_add(base, v_mul(d, L)))
    sh.append(1.0)
    faces = [(0, 1, 2)]
    for i in range(n - 2):
        a = 1 + i * 2
        faces.append((a, a + 2, a + 3, a + 1))
    last = len(verts) - 1
    faces.append((last - 2, last, last - 1))
    mb.add(verts, faces, sh, mat)


def climbing_rose(mb, c, R, seed):
    """Tiny cup-shaped rose: a ring of rounded petals around a tight bud."""
    r = random.Random(seed)
    sphere(mb, "climb", v_add(c, (0, 0, R * 0.15)), R * 0.45, squash=0.9, seg=8, rings=5, shade=(0.55, 0.9))
    n = 5
    for i in range(n):
        a = i / n * TAU + r.uniform(0, 0.5)
        p = v_add(c, (R * 0.55 * math.cos(a), R * 0.55 * math.sin(a), 0))
        sphere(mb, "climb", p, R * 0.5, squash=0.6, seg=7, rings=4, shade=(0.6, 1.0))


# ------------------------------------------------------------------ lantern
def lantern():
    """Black iron lantern post, 1.3 tall; the glass panes glow at night."""
    mb = MeshBuilder(["metal", "glass"])
    superq(mb, "metal", (0, 0, 0.04), (0.08, 0.08, 0.04), e=0.3, seg=16, rings=8, shade=(0.5, 0.9))
    tube(mb, "metal", [(0, 0, 0.06), (0, 0, 1.02)], 0.026, sides=12, shade=(0.55, 1.0))
    for z in (0.3, 0.98):
        sphere(mb, "metal", (0, 0, z), 0.036, squash=0.6, seg=12, rings=6)
    h0, h1, w = 1.04, 1.24, 0.075
    superq(mb, "metal", (0, 0, h0), (w + 0.015, w + 0.015, 0.012), e=0.3, seg=16, rings=6)
    superq(mb, "glass", (0, 0, (h0 + h1) / 2), (w - 0.004, w - 0.004, (h1 - h0) / 2), e=0.12, seg=16, rings=8, shade=(1.0, 1.0))
    for sx in (-1, 1):
        for sy in (-1, 1):
            tube(mb, "metal", [(sx * w, sy * w, h0), (sx * w, sy * w, h1)], 0.007, sides=6)
    # roof
    verts = [(0, 0, h1 + 0.1)]
    for i in range(4):
        a = i / 4 * TAU + TAU / 8
        verts.append((math.cos(a) * (w + 0.04) * 1.41, math.sin(a) * (w + 0.04) * 1.41, h1 + 0.005))
    mb.add(verts, [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1), (4, 3, 2, 1)], [0.9, 0.6, 0.6, 0.6, 0.6], "metal")
    sphere(mb, "metal", (0, 0, h1 + 0.12), 0.018, seg=10, rings=6)
    return mb.build("lantern")


lantern.view = dict(target=(0, 0, 0.75), dist=2.6, elev=12)


# ------------------------------------------------------------------ bushes, stones, ground cover
def make_bush(seed, R=0.36):
    def fn():
        mb = MeshBuilder(["hedge", "blossom"])
        r = random.Random(seed)
        cluster(mb, "hedge", (0, 0, R * 0.55), R, seed, n=9, shade=(0.5, 1.0), squash=0.78, seg=11, rings=7)
        # a sprinkle of small flowers on top
        for k in range(14):
            th = math.acos(r.uniform(0.15, 1.0))
            ph = r.uniform(0, TAU)
            p = (R * 1.02 * math.sin(th) * math.cos(ph), R * 1.02 * math.sin(th) * math.sin(ph), R * 0.55 + R * 0.82 * math.cos(th))
            sphere(mb, "blossom", p, 0.024, squash=0.7, seg=6, rings=4, shade=(0.85, 1.0))
        return mb.build(f"bush{seed}")
    fn.view = dict(target=(0, 0, R * 0.5), dist=1.6, elev=20)
    return fn


def make_stone(seed):
    def fn():
        mb = MeshBuilder(["stone"])
        r = random.Random(seed)
        n = 28
        ph = [r.uniform(0, TAU) for _ in range(3)]
        rad = lambda a: 1 + 0.12 * math.sin(2 * a + ph[0]) + 0.07 * math.sin(3 * a + ph[1]) + 0.04 * math.sin(5 * a + ph[2])
        sx, sy = 0.18 * r.uniform(0.9, 1.15), 0.15 * r.uniform(0.9, 1.15)
        rings = [(0.6, 0.0, 0.62), (0.98, 0.012, 0.75), (1.0, 0.03, 0.9), (0.92, 0.045, 1.0), (0.6, 0.052, 1.0), (0.25, 0.055, 1.0)]
        verts, sh = [], []
        for (k, z, g) in rings:
            for i in range(n):
                a = i / n * TAU
                q = rad(a) * k
                verts.append((sx * q * math.cos(a), sy * q * math.sin(a), z + 0.003 * math.sin(a * 7 + seed) * k))
                sh.append(g * (0.92 + 0.08 * math.sin(a * 3 + seed)))
        faces = []
        for j in range(len(rings) - 1):
            for i in range(n):
                a, b = j * n + i, j * n + (i + 1) % n
                faces.append((a, b, b + n, a + n))
        top = len(verts)
        verts.append((0, 0, 0.056))
        sh.append(1.0)
        last = (len(rings) - 1) * n
        for i in range(n):
            faces.append((last + i, last + (i + 1) % n, top))
        mb.add(verts, faces, sh, "stone")
        return mb.build(f"stone{seed}")
    fn.view = dict(target=(0, 0, 0.02), dist=0.9, elev=50)
    return fn


def groundcover():
    """Low rosette of broad leaves planted around each bouquet bed (radius ~0.3)."""
    mb = MeshBuilder(["leaf"])
    r = random.Random(3)
    for k in range(22):
        a = k * 2.39996 + r.uniform(-0.2, 0.2)
        ring = 0.05 + 0.2 * math.sqrt(k / 22)
        base = (ring * math.cos(a), ring * math.sin(a), 0.0)
        up = r.uniform(0.25, 0.7)
        d = v_norm((math.cos(a), math.sin(a), up))
        leaf(mb, base, d, r.uniform(0.11, 0.17), r.uniform(0.04, 0.06))
    return mb.build("groundcover")


groundcover.view = dict(target=(0, 0, 0.03), dist=1.4, elev=40)



def arch_leaf(mb, base, ang, L, Wd, rise, droop, mat="leaf", n=7):
    """Strap leaf that rises from the base and arches outward (lily / hosta style)."""
    h = (math.cos(ang), math.sin(ang), 0.0)
    side = (-math.sin(ang), math.cos(ang), 0.0)
    verts, sh, faces = [], [], []
    for i in range(n + 1):
        t = i / n
        c = (base[0] + h[0] * L * t * (1 - rise * 0.35),
             base[1] + h[1] * L * t * (1 - rise * 0.35),
             base[2] + L * (rise * t - droop * t * t))
        w = Wd * (math.sin(math.pi * min(1.0, t * 1.05)) ** 0.7 if t < 1 else 0.0) + 0.002
        # slight V-fold along the midrib
        fold = (0.0, 0.0, w * 0.35)
        verts += [v_add(v_add(c, v_mul(side, -w)), fold), c, v_add(v_add(c, v_mul(side, w)), fold)]
        g = 0.5 + 0.5 * t
        sh += [g * 0.92, g, g * 0.92]
    for i in range(n):
        a = i * 3
        faces += [(a, a + 3, a + 4, a + 1), (a + 1, a + 4, a + 5, a + 2)]
    mb.add(verts, faces, sh, mat)


def foliage():
    """Leafy perennial clump planted under every bouquet so stems disappear into greenery (r ~0.3, h ~0.28)."""
    mb = MeshBuilder(["leaf"])
    r = random.Random(21)
    N = 30
    for k in range(N):
        ang = k * 2.39996 + r.uniform(-0.15, 0.15)
        ring = 0.02 + 0.09 * math.sqrt((k + 0.5) / N)
        base = (ring * math.cos(ang), ring * math.sin(ang), -0.01)
        inner = 1 - (k / N)
        L = r.uniform(0.24, 0.34) * (0.85 + 0.25 * inner)
        rise = r.uniform(0.75, 1.15) * (0.75 + 0.4 * inner)
        arch_leaf(mb, base, ang, L, r.uniform(0.028, 0.042), rise, r.uniform(0.45, 0.9))
    return mb.build("foliage")


foliage.view = dict(target=(0, 0, 0.12), dist=1.1, elev=25)

ALL = {
    "g_tree": tree, "g_bench": bench, "g_chair": chair, "g_arch": arch, "g_lantern": lantern, "g_ground": groundcover, "g_foliage": foliage,
    "g_bush1": make_bush(1, 0.36), "g_bush2": make_bush(2, 0.28), "g_bush3": make_bush(3, 0.46),
    "g_bushlo": make_bush(4, 0.46), "g_stone1": make_stone(1), "g_stone2": make_stone(2), "g_stone3": make_stone(3),
}
