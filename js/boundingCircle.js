/*
 * Smallest enclosing circle - Library (compiled from TypeScript)
 *
 * Copyright (c) 2022 Project Nayuki
 * https://www.nayuki.io/page/smallest-enclosing-circle
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program (see COPYING.txt and COPYING.LESSER.txt).
 * If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";
// class Point {
//     constructor(x, y) {
//         this.x = x;
//         this.y = y;
//     }
// }
// class Circle {
//     constructor(x, y, r) {
//         // this.x = x;
//         // this.y = y;
//         // this[2] = r;
//     }
// }

// adapted - no longer using "Point" datastructure with .x, .y members, but rather simple arrays

//export
class BoundingCircle {
    /*
     * Returns the smallest circle that encloses all the given points. Runs in expected O(n) time, randomized.
     * Note: If 0 points are given, null is returned. If 1 point is given, a circle of radius 0 is returned.
     */
    // Initially: No boundary points known
    static makeCircle(points) {
        // Clone list to preserve the caller's data, do Durstenfeld shuffle
        let shuffled = points.slice();
        for (let i = points.length - 1; i >= 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            j = Math.max(Math.min(j, i), 0);
            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        // Progressively add points to circle or recompute circle
        let c = null;
        shuffled.forEach((p, i) => {
            if (c === null || !this.isInCircle(c, p))
                c = this.makeCircleOnePoint(shuffled.slice(0, i + 1), p);
        });
        return c;
    }
    // One boundary point known
    static makeCircleOnePoint(points, p) {
        //let c = new Circle(p[0], p[1], 0);
        let c = new Array(p[0], p[1], 0);
        points.forEach((q, i) => {
            if (!this.isInCircle(c, q)) {
                if (c[2] == 0)
                    c = this.makeDiameter(p, q);
                else
                    c = this.makeCircleTwoPoints(points.slice(0, i + 1), p, q);
            }
        });
        return c;
    }
    // Two boundary points known
    static makeCircleTwoPoints(points, p, q) {
        const circ = this.makeDiameter(p, q);
        let left = null;
        let right = null;
        // For each point not in the two-point circle
        for (const r of points) {
            if (this.isInCircle(circ, r))
                continue;
            // Form a circumcircle and classify it on left or right side
            const cross = this.crossProduct(p[0], p[1], q[0], q[1], r[0], r[1]);
            const c = this.makeCircumcircle(p, q, r);
            if (c === null)
                continue;
            else if (cross > 0 && (left === null || this.crossProduct(p[0], p[1], q[0], q[1], c[0], c[1]) > this.crossProduct(p[0], p[1], q[0], q[1], left[0], left[1])))
                left = c;
            else if (cross < 0 && (right === null || this.crossProduct(p[0], p[1], q[0], q[1], c[0], c[1]) < this.crossProduct(p[0], p[1], q[0], q[1], right[0], right[1])))
                right = c;
        }
        // Select which circle to return
        if (left === null && right === null)
            return circ;
        else if (left === null && right !== null)
            return right;
        else if (left !== null && right === null)
            return left;
        else if (left !== null && right !== null)
            return left[2] <= right[2] ? left : right;
        else
            throw new Error("Assertion error");
    }
    static makeDiameter(a, b) {
        const cx = (a[0] + b[0]) / 2;
        const cy = (a[1] + b[1]) / 2;
        const r0 = this.distance(cx, cy, a[0], a[1]);
        const r1 = this.distance(cx, cy, b[0], b[1]);
        //return new Circle(cx, cy, Math.max(r0, r1));
        return new Array(cx, cy, Math.max(r0, r1));
    }
    static makeCircumcircle(a, b, c) {
        // Mathematical algorithm from Wikipedia: Circumscribed circle
        const ox = (Math.min(a[0], b[0], c[0]) + Math.max(a[0], b[0], c[0])) / 2;
        const oy = (Math.min(a[1], b[1], c[1]) + Math.max(a[1], b[1], c[1])) / 2;
        const ax = a[0] - ox;
        const ay = a[1] - oy;
        const bx = b[0] - ox;
        const by = b[1] - oy;
        const cx = c[0] - ox;
        const cy = c[1] - oy;
        const d = (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) * 2;
        if (d == 0)
            return null;
        const x = ox + ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
        const y = oy + ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
        const ra = this.distance(x, y, a[0], a[1]);
        const rb = this.distance(x, y, b[0], b[1]);
        const rc = this.distance(x, y, c[0], c[1]);
        //return new Circle(x, y, Math.max(ra, rb, rc));
        return new Array(x, y, Math.max(ra, rb, rc));
    }
    /* Simple mathematical functions */

    static isInCircle(c, p) {
        const MULTIPLICATIVE_EPSILON = 1 + 1e-14;
        return c !== null && this.distance(p[0], p[1], c[0], c[1]) <= c[2] * MULTIPLICATIVE_EPSILON;
    }
    // Returns twice the signed area of the triangle defined by (x0, y0), (x1, y1), (x2, y2).
    static crossProduct(x0, y0, x1, y1, x2, y2) {
        return (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    }
    static distance(x0, y0, x1, y1) {
        return Math.hypot(x0 - x1, y0 - y1);
    }
}
