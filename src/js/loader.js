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

/* exported LOADER */

const LOADER = {};

(function (exports) {
    "use strict";

    const TILE_WIDTH = 32;
    const TILE_HEIGHT = 32;

    const TILE_GROUND = 1;
    const TILE_SOLID = 2;
    const TILE_WALL = 3;
    const TILE_BLOCKER = 4;

    function mapToLayer(map, convert) {
        return map.data.reduce((total, current) => total + current).split('').map(convert);
    }

    function isOneOf(char, array) {
        return array.indexOf(char) !== -1;
    }

    exports.loadMap = function (mapData, map, layers, createFunctions) {
        let tileEngine = kontra.tileEngine({
            tilewidth: TILE_WIDTH,
            tileheight: TILE_HEIGHT,
            width: mapData.data[0].length,
            height: mapData.data.length,
            tilesets: [{
                firstgid: 1,
                image: kontra.assets.images.tilesheet,
            }],
            layers: [{
                name: Map.LAYER_GROUND,
                data: mapToLayer(
                    mapData,
                    tile => isOneOf(tile, layers.ground) ? TILE_GROUND : 0),
            }, {
                name: Map.LAYER_WALLS,
                data: mapToLayer(mapData, tile => isOneOf(tile, layers.wall) ? TILE_WALL : 0),
            }, {
                name: Map.LAYER_SOLID,
                data: mapToLayer(mapData, tile => isOneOf(tile, layers.solid) ? TILE_SOLID : 0),
            }, {
                name: Map.LAYER_BLOCKERS,
                data: mapToLayer(mapData, tile => isOneOf(tile, layers.blocker) ? TILE_BLOCKER : 0),
            }],
        });

        map.reset(mapData, tileEngine);

        let data = mapData.data;

        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            let row = data[rowIndex];
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const element = row[colIndex];
                const create = createFunctions[element];

                if (create) {
                    let position = kontra.vector(colIndex * TILE_WIDTH, rowIndex * TILE_HEIGHT);
                    let entity = create(map, position);
                    map.add(entity);
                }
            }
        }
    };
})(LOADER);
