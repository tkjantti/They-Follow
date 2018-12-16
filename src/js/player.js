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

/* global VECTOR */

/* exported PLAYER */

const PLAYER = {};

(function (exports) {
    "use strict";

    const clamp = VECTOR.clamp;

    const playerSpeed = 1.5;
    const diagonalSpeedCoefficient = 0.707;

    const xMargin = 5;
    const yMargin = 4;

    exports.getSpeed = function () {
        return playerSpeed;
    };

    exports.create = function (map, position) {
        return kontra.sprite({
            type: 'player',
            position: position,
            image: kontra.assets.images.player,

            collidesWith(other) {
                let selfBounds = this.getBoundingBox();
                let otherBounds = other.getBoundingBox ? other.getBoundingBox() : other;
                return selfBounds.x < otherBounds.x + otherBounds.width &&
                    selfBounds.x + selfBounds.width > otherBounds.x &&
                    selfBounds.y < otherBounds.y + otherBounds.height &&
                    selfBounds.y + selfBounds.height > otherBounds.y;
            },

            update() {
                let xDiff = 0, yDiff = 0;

                if (kontra.keys.pressed('left')) {
                    xDiff = -playerSpeed;
                } else if (kontra.keys.pressed('right')) {
                    xDiff = playerSpeed;
                }

                if (kontra.keys.pressed('up')) {
                    yDiff = -playerSpeed;
                } else if (kontra.keys.pressed('down')) {
                    yDiff = playerSpeed;
                }

                if (xDiff && yDiff) {
                    xDiff *= diagonalSpeedCoefficient;
                    yDiff *= diagonalSpeedCoefficient;
                }

                let newX = this.x + xDiff;
                let newY = this.y + yDiff;
                let collisionBounds = this.getBoundingBox(newX, newY);

                if (!map.collidesWithWalls(collisionBounds)) {
                    this._setPosition(collisionBounds);
                } else if (xDiff && yDiff) {
                    // Check if can move horizontally.
                    collisionBounds = this.getBoundingBox(newX, this.y);
                    if (!map.collidesWithWalls(collisionBounds)) {
                        this._setPosition(collisionBounds);
                    } else {
                        // Check if can move vertically.
                        collisionBounds = this.getBoundingBox(this.x, newY);
                        if (!map.collidesWithWalls(collisionBounds)) {
                            this._setPosition(collisionBounds);
                        }
                    }
                }
            },

            _setPosition(bounds) {
                let x = clamp(bounds.x, 0, map.width - (bounds.width));
                let y = clamp(bounds.y, 0, map.height - (bounds.height));
                this.position = kontra.vector(
                    x - xMargin,
                    y - yMargin);
            },

            getBoundingBox(x = this.x, y = this.y) {
                return {
                    x: x + xMargin,
                    y: y + yMargin,
                    width: this.width - 2 * xMargin,
                    height: this.height - 2 * yMargin,
                };
            },
        });
    };
})(PLAYER);
