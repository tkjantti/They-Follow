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
        this._mapData = mapData;
        this._tileEngine = tileEngine;
        this.entities = [];
        this.player = null;
        this.artifactCount = 0;

        this.online = true;

        // When online mode was requested on/off (it takes a little time to toggle it).
        this._onlineToggleSwitchTime = null;

        const now = performance.now();

        // Last time when online mode was toggled on/off.
        this._onlineLatestToggleTime = now;

        // How long to wait until next on/off toggle.
        this._onlineToggleWaitTime = mapData ? mapData.online : null;

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

    _collidesWithLayer(entity, layer) {
        let cameraCoordinateBounds = {
            x: -this._tileEngine.sx + entity.x,
            y: -this._tileEngine.sy + entity.y,
            width: entity.width,
            height: entity.height
        };
        return this._tileEngine.layerCollidesWith(layer, cameraCoordinateBounds);
    }

    collidesWithWalls(entity) {
        return this._collidesWithLayer(entity, Map.LAYER_WALLS);
    }

    collidesWithBlockers(entity) {
        return this.online && this._collidesWithLayer(entity, Map.LAYER_BLOCKERS);
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

    update() {
        let now = performance.now();

        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            entity.update();
        }

        if (this._onlineToggleWaitTime < (now - this._onlineLatestToggleTime)) {
            this._onlineToggleSwitchTime = now;
            this._onlineLatestToggleTime = now;
            this._onlineToggleWaitTime = this.online ? this._mapData.offline : this._mapData.online;
        }

        if (this._onlineToggleSwitchTime &&
            ONLINE_TOGGLE_DELAY < (now - this._onlineToggleSwitchTime)) {
            this.online = !this.online;
            this._onlineToggleSwitchTime = null;
        }

        this.entities = this.entities.filter(s => !s.dead);
    }

    render(context) {
        this._tileEngine.renderLayer(Map.LAYER_GROUND);
        this._tileEngine.renderLayer(Map.LAYER_WALLS);
        if (this._onlineToggleSwitchTime && (Math.random() >= 0.5)) {
            this._tileEngine.renderLayer(Map.LAYER_FLASHING);
        }
        if (this.online && !this._onlineToggleSwitchTime) {
            this._tileEngine.renderLayer(Map.LAYER_BLOCKERS);
        }

        context.save();
        context.translate(-this._tileEngine.sx, -this._tileEngine.sy);
        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            entity.render();
            // @if DEBUG
            this._renderBoundingBox(entity);
            // @endif

        }
        context.restore();
    }

    // @if DEBUG
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
Map.LAYER_FLASHING = 'F';
Map.LAYER_BLOCKERS = 'B';
Map.LAYER_WALLS = 'W';
