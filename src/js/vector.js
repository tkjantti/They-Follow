/*
 * Copyright 2018 Tero Jäntti, Sami Heikkinen
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* exported VECTOR */

const VECTOR = {};

(function (exports) {
    "use strict";

    kontra.vector.prototype.plus = function (v) {
        return kontra.vector(this.x + v.x, this.y + v.y);
    };

    kontra.vector.prototype.minus = function (v) {
        return kontra.vector(this.x - v.x, this.y - v.y);
    };

    kontra.vector.prototype.magnitude = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    kontra.vector.prototype.normalized = function () {
        let length = this.magnitude();
        if (length === 0.0) {
            return kontra.vector(0, 0);
        }
        return kontra.vector(this.x / length, this.y / length);
    };

    kontra.vector.getRandomDir = function () {
        return kontra.vector(
            (Math.floor(Math.random() * 3) - 1), // -1, 0 or 1
            (Math.floor(Math.random() * 3) - 1)
        ).normalized();
    };

    /*
     * Gets distance between two positions.
     */
    exports.getDistance = function (a, b) {
        return a.minus(b).magnitude();
    };

    exports.clamp = function (value, min, max) {
        return Math.min(Math.max(value, min), max);
    };
})(VECTOR);
