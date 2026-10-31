"""Stylized flower models. Each flower: stem from z=0 up, head at z~1.0, faces +Z."""
import math
import random
from geo import MeshBuilder, petal, tube, sphere, bezier_path, TAU

GOLDEN = math.pi * (3 - math.sqrt(5))


def stem_path(top=0.99, bend=0.015, seed=0):
    rng = random.Random(seed)
    return bezier_path([(0, 0, 0), (bend * rng.uniform(-1, 1), bend * rng.uniform(-1, 1), top * 0.5),
                        (0, 0, top)], steps=8)


def along(path, t):
    f = t * (len(path) - 1)
    i = min(int(f), len(path) - 2)
    u = f - i
    a, b = path[i], path[i + 1]
    return tuple(a[k] + (b[k] - a[k]) * u for k in range(3))


def stem_leaf(mb, z, azim, L, W, seed, alpha=1.0, curl=0.55, fold=0.45, profile="pointed"):
    petal(mb, "leaf", L=L, W=W, alpha=alpha, azim=azim, r0=0.006, cup=0.0, fold=fold, curl=curl,
          profile=profile, origin=(0, 0, z), nu=6, nv=10, shade_base=0.65, shade_tip=1.0, seed=seed,
          wave=0.3)


def rose(seed=1):
    mb = MeshBuilder(["petal", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.985, seed=seed), lambda t: 0.009 - 0.002 * t, sides=8)
    sphere(mb, "leaf", (0, 0, 0.985), 0.02, squash=0.75, seg=10, rings=6)
    for i in range(5):
        petal(mb, "leaf", L=0.045, W=0.018, alpha=2.25, azim=i * TAU / 5 + 0.3, r0=0.012, h0=0.985,
              cup=0.2, curl=-0.8, profile="pointed", nu=4, nv=7, shade_base=0.7, seed=seed + i)
    N = 30
    rng = random.Random(seed)
    for i in range(N):
        t = i / (N - 1)
        L = 0.046 + 0.066 * t ** 0.9
        petal(mb, "petal",
              L=L, W=L * (1.0 + 0.45 * t),
              alpha=0.04 + 0.95 * t ** 1.7 + rng.uniform(-0.03, 0.03),
              azim=i * GOLDEN * 1.0 + rng.uniform(-0.1, 0.1),
              r0=0.003 + 0.014 * t, h0=0.992 - 0.008 * t,
              cup=1.9 - 1.25 * t, curl=0.05 + 1.1 * t ** 2.4,
              profile="obovate", nu=10, nv=14, reflex=0.05 + 0.3 * t ** 1.5,
              shade_base=0.4 + 0.25 * t, shade_tip=0.84 + 0.16 * t,
              wave=0.2 * t, seed=seed * 100 + i)
    stem_leaf(mb, 0.62, 0.4, 0.12, 0.06, seed + 7)
    stem_leaf(mb, 0.74, 3.4, 0.1, 0.05, seed + 8)
    return mb.build("rose")


def tulip(seed=2):
    mb = MeshBuilder(["petal", "leaf", "stem"])
    tube(mb, "stem", stem_path(1.0, seed=seed), lambda t: 0.011 - 0.003 * t, sides=8)
    sphere(mb, "stem", (0, 0, 1.0), 0.016, squash=0.8, seg=10, rings=6)
    for ring, (alpha, L, W, cup, curl, r0, off) in enumerate([
        (0.2, 0.175, 0.125, 0.95, -0.42, 0.01, 0.0),
        (0.11, 0.165, 0.115, 1.05, -0.3, 0.004, math.pi / 3),
    ]):
        for i in range(3):
            petal(mb, "petal", L=L, W=W, alpha=alpha, azim=off + i * TAU / 3, r0=r0, h0=0.995,
                  cup=cup, curl=curl, profile="egg", nu=9, nv=14,
                  shade_base=0.55 + 0.1 * ring, shade_tip=1.0, seed=seed * 10 + ring * 3 + i)
    petal(mb, "leaf", L=0.42, W=0.075, alpha=0.32, azim=0.8, r0=0.008, cup=0.7, curl=0.7,
          profile="pointed", origin=(0, 0, 0.38), nu=6, nv=14, shade_base=0.6, seed=seed + 50)
    return mb.build("tulip")


def daisy(seed=3):
    mb = MeshBuilder(["petal", "center", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.99, bend=0.03, seed=seed), 0.006, sides=6)
    sphere(mb, "stem", (0, 0, 0.99), 0.026, squash=0.4, seg=12, rings=5)

    def bump(th, ph):
        return 1.0 + 0.04 * math.sin(ph * 13) * math.sin(th * 9)

    sphere(mb, "center", (0, 0, 1.0), 0.032, squash=0.55, seg=20, rings=10, shade=(0.55, 1.0), bump=bump)
    N = 24
    rng = random.Random(seed)
    for ring in range(2):
        for i in range(N):
            petal(mb, "petal", L=0.105 - ring * 0.012, W=0.026,
                  alpha=1.22 + ring * 0.08 + rng.uniform(-0.08, 0.08),
                  azim=(i + 0.5 * ring) * TAU / N + rng.uniform(-0.05, 0.05),
                  r0=0.026, h0=1.0 - 0.004 * ring, cup=0.18, curl=0.3 + rng.uniform(-0.15, 0.15),
                  profile="strap", nu=4, nv=9, shade_base=0.78, shade_tip=1.0,
                  twist=rng.uniform(-0.2, 0.2), seed=seed * 100 + ring * 50 + i)
    stem_leaf(mb, 0.5, 1.0, 0.11, 0.035, seed + 9, alpha=0.9)
    return mb.build("daisy")


def sunflower(seed=4):
    mb = MeshBuilder(["petal", "center", "leaf", "stem"])
    tube(mb, "stem", stem_path(0.97, seed=seed), lambda t: 0.013 - 0.003 * t, sides=8)
    sphere(mb, "leaf", (0, 0, 0.975), 0.05, squash=0.35, seg=16, rings=6)

    def seeds(th, ph):
        return 1.0 + 0.025 * math.sin(th * 40) * math.sin(ph * 21)

    sphere(mb, "center", (0, 0, 0.985), 0.068, squash=0.32, seg=36, rings=14, shade=(0.45, 1.0), bump=seeds)
    rng = random.Random(seed)
    for ring in range(2):
        N = 21
        for i in range(N):
            petal(mb, "petal", L=0.105 + rng.uniform(-0.01, 0.01), W=0.042,
                  alpha=1.28 + ring * 0.12 + rng.uniform(-0.06, 0.06),
                  azim=(i + 0.5 * ring) * TAU / N + rng.uniform(-0.05, 0.05),
                  r0=0.058, h0=0.985 - 0.008 * ring, cup=0.3, curl=0.25 + rng.uniform(-0.15, 0.2),
                  profile="pointed", nu=5, nv=10, shade_base=0.7, shade_tip=1.0,
                  twist=rng.uniform(-0.25, 0.25), seed=seed * 100 + ring * 50 + i)
    for i in range(16):
        petal(mb, "leaf", L=0.05, W=0.022, alpha=1.7, azim=i * TAU / 16, r0=0.045, h0=0.975,
              cup=0.2, curl=-0.4, profile="pointed", nu=3, nv=6, shade_base=0.7, seed=seed + 300 + i)
    stem_leaf(mb, 0.58, 0.2, 0.16, 0.12, seed + 9, alpha=1.15, profile="round", fold=0.25)
    return mb.build("sunflower")


def gypsophila(seed=5):
    """Baby's breath: branching stems with clouds of tiny white blossoms."""
    mb = MeshBuilder(["bud", "stem"])
    rng = random.Random(seed)
    tube(mb, "stem", bezier_path([(0, 0, 0), (0.01, 0, 0.4), (0, 0.01, 0.78)], 6), 0.004, sides=5)

    def branch(p, direction, length, depth):
        end = (p[0] + direction[0] * length, p[1] + direction[1] * length, p[2] + direction[2] * length)
        tube(mb, "stem", [p, end], 0.0025 if depth < 2 else 0.0016, sides=4, cap_end=False)
        if depth == 3:
            sphere(mb, "bud", end, 0.007 + rng.uniform(-0.0015, 0.0015), seg=7, rings=5, shade=(0.75, 1.0))
            return
        for _ in range(3 if depth else 5):
            ang = rng.uniform(0, TAU)
            spread = 0.35 + 0.15 * depth
            d = (direction[0] + math.cos(ang) * spread, direction[1] + math.sin(ang) * spread, direction[2])
            l = math.sqrt(sum(c * c for c in d))
            branch(end, (d[0] / l, d[1] / l, d[2] / l), length * 0.62, depth + 1)

    branch((0, 0, 0.78), (0, 0, 1), 0.1, 0)
    return mb.build("gypsophila")


def eucalyptus(seed=6):
    mb = MeshBuilder(["leaf", "stem"])
    path = bezier_path([(0, 0, 0), (0.02, 0, 0.5), (-0.01, 0.01, 0.85), (0.03, 0.0, 1.1)], 8)
    tube(mb, "stem", path, lambda t: 0.005 - 0.002 * t, sides=6)
    rng = random.Random(seed)
    n = len(path)
    pairs = 9
    for k in range(pairs):
        tt = 0.42 + 0.55 * k / (pairs - 1)
        p = path[int(tt * (n - 1))]
        size = 0.085 - 0.05 * (k / (pairs - 1))
        base_az = k * math.pi / 2 + rng.uniform(-0.3, 0.3)
        for side in (0, math.pi):
            petal(mb, "leaf", L=size, W=size * 0.95, alpha=1.15 + rng.uniform(-0.2, 0.2),
                  azim=base_az + side, r0=0.004, cup=0.15, curl=0.35, profile="disc",
                  origin=p, nu=7, nv=9, shade_base=0.75, shade_tip=1.0, seed=seed * 10 + k)
    return mb.build("eucalyptus")


def lavender(seed=7):
    mb = MeshBuilder(["petal", "stem"])
    rng = random.Random(seed)
    for s in range(3):
        ang = s * TAU / 3 + 0.4
        lean = 0.05
        top = (math.cos(ang) * lean, math.sin(ang) * lean, 1.02 - s * 0.04)
        path = bezier_path([(0, 0, 0), (top[0] * 0.3, top[1] * 0.3, 0.5), top], 8)
        tube(mb, "stem", path, 0.0035, sides=5)
        # flower spike: whorls of tiny buds along the last 22% of the stem
        for k in range(18):
            tt = 0.76 + 0.24 * k / 17
            p = along(path, tt)
            r = 0.008 * (1 - 0.45 * k / 17)
            for j in range(5):
                a = j * TAU / 5 + k * 0.7
                c = (p[0] + math.cos(a) * r, p[1] + math.sin(a) * r, p[2] + rng.uniform(-0.003, 0.003))
                sphere(mb, "petal", c, 0.0062 * (1 - 0.35 * k / 17), squash=1.3, seg=5, rings=3,
                       shade=(0.55 + 0.3 * k / 17, 1.0))
    return mb.build("lavender")


ALL = {
    "rose": rose, "tulip": tulip, "daisy": daisy, "sunflower": sunflower,
    "gypsophila": gypsophila, "eucalyptus": eucalyptus, "lavender": lavender,
}
