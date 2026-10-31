"""Second wave of flowers: peony, carnation, ranunculus, lily, calla, anemone, poppy,
hydrangea, orchid + fern and cotton fillers. Same conventions as flowers.py."""
import math
import random
from mathutils import Vector, Matrix
from geo import MeshBuilder, petal, tube, sphere, bezier_path, TAU
from flowers import stem_path, along, stem_leaf, GOLDEN


def oriented(normal, spin=0.0, at=(0, 0, 0), scale=1.0):
    """Transform for geometry built facing +Z at the origin."""
    n = Vector(normal).normalized()
    R = Vector((0, 0, 1)).rotation_difference(n).to_matrix() @ Matrix.Rotation(spin, 3, "Z")
    o = Vector(at)

    def xf(p):
        q = R @ (Vector(p) * scale) + o
        return (q.x, q.y, q.z)
    return xf


def sepal_cup(mb, z, n=5, L=0.04, r0=0.012, mat="leaf", seed=0):
    sphere(mb, mat, (0, 0, z), r0 * 1.4, squash=0.7, seg=10, rings=6)
    for i in range(n):
        petal(mb, mat, L=L, W=L * 0.4, alpha=2.2, azim=i * TAU / n + 0.4, r0=r0, h0=z,
              cup=0.2, curl=-0.7, profile="pointed", nu=4, nv=6, shade_base=0.7, seed=seed + i)


# ------------------------------------------------------------------ peony

def peony(seed=11):
    mb = MeshBuilder(["petal", "center", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.965, seed=seed), lambda t: 0.011 - 0.003 * t, sides=8)
    sepal_cup(mb, 0.965, n=5, L=0.05, r0=0.016, seed=seed)
    rng = random.Random(seed)
    # guard petals: big, cupped, open bowl
    for i in range(8):
        petal(mb, "petal", L=0.105 + rng.uniform(-0.01, 0.01), W=0.12, alpha=1.0 + rng.uniform(-0.1, 0.12),
              azim=i * TAU / 8 + rng.uniform(-0.15, 0.15), r0=0.02, h0=0.972, cup=0.75, curl=0.4,
              profile="broad", nu=12, nv=12, ruffle=0.05, ruffle_freq=6, shade_base=0.62, shade_tip=1.0,
              seed=seed * 50 + i)
    # the dense ruffled bomb inside
    N = 78
    for i in range(N):
        t = i / (N - 1)
        petal(mb, "petal", L=0.03 + 0.06 * t ** 0.75, W=0.055 + 0.085 * t ** 0.75,
              alpha=0.14 + 1.0 * t ** 1.15 + rng.uniform(-0.03, 0.03),
              azim=i * GOLDEN + rng.uniform(-0.06, 0.06), r0=0.004 + 0.014 * t, h0=0.975,
              cup=1.3 - 0.75 * t, curl=-0.3 + 0.45 * t, profile="broad", nu=10, nv=9,
              ruffle=0.12 - 0.06 * t, ruffle_freq=8, shade_base=0.5 + 0.2 * t, shade_tip=0.92 + 0.08 * t,
              twist=rng.uniform(-0.3, 0.3), seed=seed * 100 + i)
    stem_leaf(mb, 0.6, 0.5, 0.15, 0.06, seed + 3, alpha=1.0)
    stem_leaf(mb, 0.7, 3.7, 0.13, 0.05, seed + 4, alpha=1.1)
    return mb.build("peony")


# ------------------------------------------------------------------ carnation

def carnation(seed=12):
    mb = MeshBuilder(["petal", "leaf", "stem"])
    path = stem_path(0.93, bend=0.02, seed=seed)
    tube(mb, "stem", path, 0.0055, sides=7)
    for z in (0.35, 0.6, 0.8):  # swollen nodes + narrow grey-green leaf pairs
        sphere(mb, "stem", (0, 0, z), 0.008, squash=1.4, seg=8, rings=5)
        for s in (0, math.pi):
            petal(mb, "leaf", L=0.09, W=0.012, alpha=0.75, azim=s + z * 4, r0=0.004, cup=0.4, curl=0.6,
                  profile="pointed", origin=(0, 0, z), nu=3, nv=8, shade_base=0.7, seed=seed + int(z * 100))
    # calyx: long tube widening toward the head
    tube(mb, "stem", [(0, 0, 0.92), (0, 0, 0.95), (0, 0, 0.975)], lambda t: 0.009 + 0.008 * t, sides=10)
    rng = random.Random(seed)
    N = 46
    for i in range(N):
        t = i / (N - 1)
        petal(mb, "petal", L=0.04 + 0.022 * t, W=0.05 + 0.012 * t,
              alpha=0.25 + 1.2 * t ** 1.2 + rng.uniform(-0.08, 0.08),
              azim=i * GOLDEN + rng.uniform(-0.25, 0.25), r0=0.004 + 0.01 * t, h0=0.972,
              cup=0.5 - 0.2 * t, curl=0.15 + 0.4 * t, profile="fan", nu=10, nv=7,
              ruffle=0.42, ruffle_freq=22, shade_base=0.55 + 0.25 * t, shade_tip=1.0,
              twist=rng.uniform(-0.4, 0.4), seed=seed * 100 + i)
    return mb.build("carnation")


# ------------------------------------------------------------------ ranunculus

def ranunculus(seed=13):
    mb = MeshBuilder(["petal", "center", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.975, seed=seed), lambda t: 0.0075 - 0.0015 * t, sides=7)
    sepal_cup(mb, 0.975, n=5, L=0.028, r0=0.012, seed=seed)
    sphere(mb, "center", (0, 0, 1.005), 0.01, squash=0.8, seg=10, rings=6, shade=(0.5, 1.0))
    rng = random.Random(seed)
    N = 72
    for i in range(N):
        t = i / (N - 1)
        petal(mb, "petal", L=0.02 + 0.042 * t ** 0.75, W=0.04 + 0.06 * t ** 0.75,
              alpha=0.15 + 1.1 * t ** 1.1 + rng.uniform(-0.02, 0.02),
              azim=i * GOLDEN + rng.uniform(-0.04, 0.04), r0=0.004 + 0.01 * t, h0=0.982,
              cup=1.5 - 0.7 * t, curl=-0.35 + 0.45 * t, profile="round", nu=9, nv=8,
              shade_base=0.45 + 0.35 * t, shade_tip=0.85 + 0.15 * t, seed=seed * 100 + i)
    stem_leaf(mb, 0.55, 2.0, 0.09, 0.04, seed + 5, alpha=1.0)
    return mb.build("ranunculus")


# ------------------------------------------------------------------ lily

def lily(seed=14):
    mb = MeshBuilder(["petal", "center", "leaf", "stem"])
    path = stem_path(0.94, bend=0.02, seed=seed)
    tube(mb, "stem", path, lambda t: 0.009 - 0.002 * t, sides=8)
    sphere(mb, "stem", (0, 0, 0.94), 0.012, squash=1.2, seg=10, rings=6)
    for ring in range(2):
        for i in range(3):
            petal(mb, "petal", L=0.15 - ring * 0.01, W=0.055 + ring * 0.012,
                  alpha=0.55 + ring * 0.08, azim=i * TAU / 3 + ring * math.pi / 3, r0=0.006, h0=0.945,
                  cup=0.55, curl=1.75, profile="lance", nu=7, nv=16, reflex=0.12, ruffle=0.05,
                  ruffle_freq=6, shade_base=0.62, shade_tip=1.0, spots=(9, 0.55),
                  seed=seed * 10 + ring * 3 + i)
    # six stamens with anthers + one pistil
    rng = random.Random(seed)
    for i in range(6):
        a = i * TAU / 6 + 0.25
        tip = (math.cos(a) * 0.04, math.sin(a) * 0.04, 1.055)
        p = bezier_path([(0, 0, 0.95), (math.cos(a) * 0.012, math.sin(a) * 0.012, 1.0), tip], 5)
        tube(mb, "stem", p, 0.0012, sides=4)
        sphere(mb, "center", (tip[0], tip[1], tip[2] + 0.002), 0.0055, squash=0.45, seg=8, rings=5,
               shade=(0.6, 1.0))
    tube(mb, "stem", bezier_path([(0, 0, 0.95), (0.004, 0, 1.01), (0.006, 0.0, 1.06)], 5), 0.0016, sides=5)
    sphere(mb, "stem", (0.006, 0, 1.062), 0.004, seg=8, rings=5)
    for k, z in enumerate((0.45, 0.6, 0.72, 0.82)):
        petal(mb, "leaf", L=0.1, W=0.02, alpha=0.7, azim=k * 2.3, r0=0.006, cup=0.3, curl=0.5,
              profile="pointed", origin=(0, 0, z), nu=3, nv=8, shade_base=0.7, seed=seed + 20 + k)
    return mb.build("lily")


# ------------------------------------------------------------------ calla

def calla(seed=15):
    mb = MeshBuilder(["petal", "center", "stem"])
    tube(mb, "stem", stem_path(0.93, bend=0.01, seed=seed), 0.0085, sides=10)
    # spathe: a sheet rolled into a funnel that opens and flares, back tip pointing up
    nu, nv = 20, 18
    verts, shade = [], []
    for j in range(nv + 1):
        v = j / nv
        z = 0.93 + 0.13 * v
        r = 0.009 + 0.05 * v ** 1.5
        span = math.pi * (0.98 - 0.55 * v ** 1.6)
        flare = 0.025 * v ** 4
        for i in range(nu + 1):
            u = i / nu * 2 - 1
            ph = u * span + math.pi / 2  # back of the funnel faces +Y
            tipup = 0.06 * (1 - abs(u)) ** 2 * v ** 3
            rr = r + flare * abs(u) ** 1.5
            verts.append((rr * math.cos(ph), rr * math.sin(ph) + 0.004 * v, z + tipup - 0.012 * abs(u) * v ** 2))
            shade.append(0.55 + 0.45 * v ** 0.6)
    faces = []
    row = nu + 1
    for j in range(nv):
        for i in range(nu):
            a = j * row + i
            faces.append((a, a + 1, a + row + 1, a + row))
    mb.add(verts, faces, shade, "petal")
    tube(mb, "center", [(0, 0.004, 0.94), (0, 0.006, 1.0), (0, 0.009, 1.035)],
         lambda t: 0.0055 * (1 - 0.35 * t), sides=10, shade=(0.7, 1.0))
    return mb.build("calla")


# ------------------------------------------------------------------ anemone

def anemone(seed=16):
    mb = MeshBuilder(["petal", "center", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.98, bend=0.03, seed=seed), 0.0055, sides=6)
    rng = random.Random(seed)
    # frilly leaf collar a little below the head
    for i in range(3):
        petal(mb, "leaf", L=0.05, W=0.03, alpha=1.3, azim=i * TAU / 3, r0=0.004, cup=0.1, curl=0.3,
              profile="pointed", origin=(0, 0, 0.9), nu=5, nv=7, ruffle=0.45, ruffle_freq=14,
              shade_base=0.7, seed=seed + i)
    for ring in range(2):
        for i in range(6 if ring == 0 else 5):
            petal(mb, "petal", L=0.062 - ring * 0.008, W=0.06 - ring * 0.006,
                  alpha=1.08 + ring * 0.12 + rng.uniform(-0.06, 0.06),
                  azim=i * TAU / (6 if ring == 0 else 5) + ring * 0.6, r0=0.012, h0=0.985 - ring * 0.003,
                  cup=0.55, curl=0.18, profile="round", nu=9, nv=10, notch=0.04, wave=0.4,
                  shade_base=0.7, shade_tip=1.0, seed=seed * 10 + ring * 7 + i)
    sphere(mb, "center", (0, 0, 0.995), 0.014, squash=0.75, seg=14, rings=8, shade=(0.4, 1.0),
           bump=lambda th, ph: 1 + 0.06 * math.sin(th * 14) * math.sin(ph * 11))
    for i in range(40):  # ring of dark stamens
        a = i * GOLDEN * 3
        r = 0.016 + 0.006 * rng.random()
        base = (math.cos(a) * 0.01, math.sin(a) * 0.01, 0.992)
        tip = (math.cos(a) * r, math.sin(a) * r, 1.0 + 0.006 * rng.random())
        tube(mb, "center", [base, tip], 0.0007, sides=3, cap_end=False)
        sphere(mb, "center", tip, 0.0018, seg=5, rings=3)
    return mb.build("anemone")


# ------------------------------------------------------------------ poppy

def poppy(seed=17):
    mb = MeshBuilder(["petal", "center", "stem"])
    path = bezier_path([(0, 0, 0), (0.03, 0.01, 0.5), (0.0, -0.01, 0.97)], 10)
    tube(mb, "stem", path, 0.0045, sides=6)
    rng = random.Random(seed)
    for i in range(4):
        big = i % 2 == 0
        petal(mb, "petal", L=0.085 if big else 0.078, W=0.11 if big else 0.1,
              alpha=0.85 + (0.12 if big else 0.0) + rng.uniform(-0.05, 0.05),
              azim=i * TAU / 4 + rng.uniform(-0.1, 0.1), r0=0.008, h0=0.972 - (0 if big else 0.004),
              cup=0.9, curl=0.2, profile="fan", nu=12, nv=11, ruffle=0.09, ruffle_freq=6, wave=0.5,
              shade_base=0.12, shade_tip=1.0, seed=seed * 10 + i)
    sphere(mb, "stem", (0, 0, 0.985), 0.013, squash=1.0, seg=12, rings=8)  # seed pod
    sphere(mb, "center", (0, 0, 0.998), 0.011, squash=0.25, seg=12, rings=4, shade=(0.5, 1.0))
    for i in range(36):
        a = i * GOLDEN * 5
        base = (math.cos(a) * 0.012, math.sin(a) * 0.012, 0.98)
        tip = (math.cos(a) * 0.022, math.sin(a) * 0.022, 0.99 + 0.005 * rng.random())
        tube(mb, "center", [base, tip], 0.0006, sides=3, cap_end=False)
        sphere(mb, "center", tip, 0.0016, seg=5, rings=3)
    return mb.build("poppy")


# ------------------------------------------------------------------ hydrangea

def hydrangea(seed=18):
    mb = MeshBuilder(["petal", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.92, seed=seed), lambda t: 0.01 - 0.002 * t, sides=8)
    rng = random.Random(seed)
    floret = MeshBuilder(["petal"])
    for k in range(4):
        petal(floret, "petal", L=0.02, W=0.02, alpha=1.32, azim=k * TAU / 4, r0=0.002, cup=0.35, curl=0.12,
              profile="round", nu=5, nv=5, shade_base=0.72, shade_tip=1.0, seed=seed + k)
    sphere(floret, "petal", (0, 0, 0.002), 0.0025, seg=6, rings=3, shade=(0.8, 1.0))
    center = Vector((0, 0, 0.985))
    R = 0.072
    N = 110
    for i in range(N):
        zz = 1 - 1.55 * (i + 0.5) / N  # covers the top and sides of the ball
        r = math.sqrt(max(0.0, 1 - zz * zz))
        a = i * GOLDEN
        n = Vector((math.cos(a) * r, math.sin(a) * r, zz))
        pos = center + n * (R + rng.uniform(-0.004, 0.004))
        mb.merge(floret, oriented(n, spin=rng.uniform(0, TAU), at=pos, scale=rng.uniform(0.85, 1.12)))
    sphere(mb, "stem", (0, 0, 0.97), R * 0.85, squash=0.9, seg=14, rings=8)
    for k in range(2):
        petal(mb, "leaf", L=0.15, W=0.085, alpha=1.25, azim=k * math.pi + 0.6, r0=0.008, cup=0.25, curl=0.35,
              profile="round", origin=(0, 0, 0.86), nu=7, nv=11, ruffle=0.12, ruffle_freq=18,
              shade_base=0.6, seed=seed + 40 + k)
    return mb.build("hydrangea")


# ------------------------------------------------------------------ orchid

def orchid_flower(seed):
    f = MeshBuilder(["petal", "center"])
    for k, az in enumerate((math.pi / 2, math.pi / 2 + TAU / 3, math.pi / 2 - TAU / 3)):  # sepals
        petal(f, "petal", L=0.045, W=0.024, alpha=1.42, azim=az, r0=0.003, cup=0.3, curl=0.2,
              profile="lance", nu=6, nv=8, shade_base=0.8, shade_tip=1.0, seed=seed + k)
    for k, az in enumerate((math.radians(18), math.radians(162))):  # broad side petals
        petal(f, "petal", L=0.048, W=0.058, alpha=1.45, azim=az, r0=0.003, cup=0.15, curl=0.15,
              profile="round", nu=8, nv=9, shade_base=0.78, shade_tip=1.0, seed=seed + 10 + k)
    petal(f, "center", L=0.026, W=0.022, alpha=1.0, azim=-math.pi / 2, r0=0.004, h0=0.004, cup=1.6,
          curl=-0.4, profile="round", nu=6, nv=6, shade_base=0.6, seed=seed + 20)  # lip
    sphere(f, "center", (0, 0.004, 0.006), 0.0045, squash=1.2, seg=8, rings=5)  # column
    return f


def orchid(seed=19):
    mb = MeshBuilder(["petal", "center", "stem"])
    path = bezier_path([(0, 0, 0), (0.0, 0.0, 0.72), (0.0, -0.04, 0.98), (0.0, -0.15, 1.1), (0.0, -0.27, 1.08)], 10)
    tube(mb, "stem", path, 0.0045, sides=6)
    rng = random.Random(seed)
    spots = [0.6, 0.68, 0.76, 0.84, 0.91]
    for k, tt in enumerate(spots):
        p = Vector(along(path, tt))
        side = -1 if k % 2 else 1
        n = Vector((0.35 * side, -0.85, 0.45))
        at = p + Vector((0.025 * side, -0.01, 0.0))
        tube(mb, "stem", [tuple(p), tuple(at)], 0.0018, sides=4)
        mb.merge(orchid_flower(seed + k * 31), oriented(n, spin=rng.uniform(-0.15, 0.15), at=at,
                                                        scale=1.15 - 0.08 * k))
    for tt in (0.97, 1.0):  # buds at the tip
        p = along(path, tt)
        sphere(mb, "petal", p, 0.01, squash=1.2, seg=8, rings=6, shade=(0.6, 0.95))
    return mb.build("orchid")


# ------------------------------------------------------------------ fern

def fern(seed=20):
    mb = MeshBuilder(["leaf", "stem"])
    path = bezier_path([(0, 0, 0), (0.0, 0.0, 0.55), (0.0, 0.06, 0.92), (0.0, 0.16, 1.08)], 10)
    tube(mb, "stem", path, lambda t: 0.004 - 0.0025 * t, sides=5)
    rng = random.Random(seed)
    N = 22
    for k in range(N):
        tt = 0.42 + 0.57 * k / (N - 1)
        p = along(path, tt)
        q = along(path, min(1.0, tt + 0.01))
        lean = 0.0
        size = 0.1 * (1 - 0.8 * (k / (N - 1)) ** 1.3)
        for side in (-1, 1):
            petal(mb, "leaf", L=size * 1.15, W=size * 0.3, alpha=1.3, azim=(0 if side > 0 else math.pi) + side * 0.25,
                  r0=0.002, cup=0.4, curl=0.35, profile="pointed", origin=p, nu=4, nv=7,
                  ruffle=0.18, ruffle_freq=12, shade_base=0.7, shade_tip=1.0,
                  seed=seed * 100 + k * 2 + (side > 0))
    return mb.build("fern")


fern.view = dict(target=(0.0, 0.05, 0.85), dist=0.75, elev=30)


# ------------------------------------------------------------------ cotton

def cotton(seed=21):
    mb = MeshBuilder(["bud", "husk", "stem"])
    rng = random.Random(seed)
    main = bezier_path([(0, 0, 0), (0.01, 0, 0.5), (0.0, 0.01, 0.9)], 8)
    tube(mb, "stem", main, lambda t: 0.0055 - 0.002 * t, sides=6)
    heads = [((0, 0, 0.9), (0, 0, 1)), ((0.0, 0.0, 0.74), (0.7, -0.2, 0.7)), ((0.0, 0.0, 0.8), (-0.6, 0.3, 0.75))]
    for k, (start, d) in enumerate(heads):
        dn = Vector(d).normalized()
        end = Vector(start) + dn * (0.0 if k == 0 else 0.07)
        if k:
            tube(mb, "stem", [start, tuple(end)], 0.0032, sides=5)
        c = end + dn * 0.03
        # husk: pointed brown bracts cupping the boll
        sub = MeshBuilder(["husk"])
        for i in range(5):
            petal(sub, "husk", L=0.042, W=0.03, alpha=1.0, azim=i * TAU / 5, r0=0.006, cup=0.9, curl=0.7,
                  profile="pointed", nu=5, nv=7, shade_base=0.55, shade_tip=0.95, seed=seed + k * 9 + i)
        mb.merge(sub, oriented(dn, at=tuple(end)))
        for i in range(5):  # fluffy locules
            a = i * TAU / 5 + 0.3
            off = Vector((math.cos(a) * 0.016, math.sin(a) * 0.016, 0.008))
            pos = c + (Vector(oriented(dn)(tuple(off))))
            sphere(mb, "bud", tuple(pos), 0.02, squash=0.95, seg=14, rings=10, shade=(0.78, 1.0),
                   bump=lambda th, ph, s=rng.random() * 9: 1 + 0.07 * math.sin(th * 6 + s) * math.sin(ph * 5 + s))
    return mb.build("cotton")


ALL = {
    "peony": peony, "carnation": carnation, "ranunculus": ranunculus, "lily": lily, "calla": calla,
    "anemone": anemone, "poppy": poppy, "hydrangea": hydrangea, "orchid": orchid,
    "fern": fern, "cotton": cotton,
}
