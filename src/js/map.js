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

/* exported Map */

const ONLINE_TOGGLE_DELAY = 1200;

class StableLayer {
    toggle() {}
    isVisible() { return true; }
    update() {}
}

class ToggleLayer {
    constructor(online = undefined, offline = undefined) {
        this.online = true;
        this.toggleRequestTime = null;
        if (online && offline) {
            this.onlineTime = online;
            this.offlineTime = offline;
            this.toggleWaitTime = online;
            this.autoToggleTime = performance.now();
        }
    }

    toggle() {
        if (!this.toggleRequestTime) {
            let now = performance.now();
            this.toggleRequestTime = now;
        }
    }

    isVisible() {
        return this.toggleRequestTime ? (Math.random() >= 0.5) : this.online;
    }

    update(now) {
        if (this.toggleWaitTime && this.toggleWaitTime < (now - this.autoToggleTime)) {
            this.toggleRequestTime = now;
            this.autoToggleTime = now;
            this.toggleWaitTime = this.online ? this.offlineTime : this.onlineTime;
        }

        if (this.toggleRequestTime &&
            ONLINE_TOGGLE_DELAY < (now - this.toggleRequestTime)) {
            this.online = !this.online;
            this.toggleRequestTime = null;
        }
    }
}

class Map {
    get width() {
        return this._tileEngine.mapwidth;
    }

    get height() {
        return this._tileEngine.mapheight;
    }

    get helpText() {
        return this._mapData.text;
    }

    constructor() {
        this.reset();
    }

    reset(mapData = null, tileEngine = null) {
        const now = performance.now();

        let online = mapData ? mapData.online : null;
        let offline = mapData ? mapData.offline : null;
        this._mapData = mapData;
        this._tileEngine = tileEngine;
        this.layers = {
            [Map.LAYER_GROUND]: new StableLayer(),
            [Map.LAYER_WALLS]: new StableLayer(),
            [Map.LAYER_SOLID]: new ToggleLayer(),
            [Map.LAYER_BLOCKERS]: new ToggleLayer(online, offline),
        };
        this.entities = [];
        this.player = null;
        this.artifactCount = 0;
        this.startTime = now;
    }

    add(entity) {
        this.entities.push(entity);
        if (entity.type === 'item') {
            this.artifactCount++;
        }
        if (entity.type === 'player') {
            this.player = entity;
        }
    }

    _collidesWithLayer(entity, layerId) {
        let cameraCoordinateBounds = {
            x: -this._tileEngine.sx + entity.x,
            y: -this._tileEngine.sy + entity.y,
            width: entity.width,
            height: entity.height
        };
        var layer = this.layers[layerId];
        return layer.online &&
            this._tileEngine.layerCollidesWith(layerId, cameraCoordinateBounds);
    }

    collidesWithWalls(entity) {
        return this._collidesWithLayer(entity, Map.LAYER_WALLS) ||
            this._collidesWithLayer(entity, Map.LAYER_SOLID);
    }

    collidesWithBlockers(entity) {
        return this._collidesWithLayer(entity, Map.LAYER_BLOCKERS) ||
            this._collidesWithLayer(entity, Map.LAYER_SOLID);
    }

    adjustCamera(position, speed) {
        const margin = 200;

        if (position.x - this._tileEngine.sx < margin) {
            this._tileEngine.sx -= speed;
        } else if ((this._tileEngine.sx + kontra.canvas.width) - position.x < margin) {
            this._tileEngine.sx += speed;
        }

        if (position.y - this._tileEngine.sy < margin) {
            this._tileEngine.sy -= speed;
        } else if ((this._tileEngine.sy + kontra.canvas.height) - position.y < margin) {
            this._tileEngine.sy += speed;
        }
    }

    toggleLayer(layerId) {
        let layer = this.layers[layerId];
        if (layer) {
            layer.toggle();
        }
    }

    update() {
        let now = performance.now();

        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            entity.update();
        }

        for (let layerId in this.layers) {
            if (this.layers.hasOwnProperty(layerId)) {
                this.layers[layerId].update(now);
            }
        }

        this.entities = this.entities.filter(s => !s.dead);
    }

    _renderLayer(layerId) {
        var layer = this.layers[layerId];
        if (layer.isVisible()) {
            this._tileEngine.renderLayer(layerId);
        }
    }

    render(context) {
        this._renderLayer(Map.LAYER_GROUND);
        this._renderLayer(Map.LAYER_WALLS);
        this._renderLayer(Map.LAYER_SOLID);
        this._renderLayer(Map.LAYER_BLOCKERS);

        context.save();
        context.translate(-this._tileEngine.sx, -this._tileEngine.sy);
        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            entity.render();
            // @if VISUAL_DEBUG
            this._renderBoundingBox(entity);
            // @endif

        }
        context.restore();
    }

    // @if VISUAL_DEBUG
    _renderBoundingBox(entity) {
        if (!entity.getBoundingBox) {
            return;
        }

        var box = entity.getBoundingBox();
        var cx = kontra.context;

        cx.strokeStyle = 'white';
        cx.strokeRect(box.x, box.y, box.width, box.height);
    }
    // @endif
}

Map.LAYER_GROUND = 'G';
Map.LAYER_BLOCKERS = 'B';
Map.LAYER_SOLID = 'S';
Map.LAYER_WALLS = 'W';
