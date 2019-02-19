/*
 * Copyright 2018-2019 Tero Jäntti, Sami Heikkinen
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

/* exported StableLayer, ToggleLayer */

const ONLINE_TOGGLE_DELAY = 1200;


/*
 * A layer that is always active.
 */
class StableLayer {
    toggle() {}
    isVisible() { return true; }
    update() {}
}


/* A layer that can be toggled on or off, either by
 * - calling the toggle method
 * - automatically if constructor parameters are provided.
 */
class ToggleLayer {

    /*
     * Constructor. Parameters:
     * - online: how long to have the layer active before toggling
     * - offline: how long to have the layer inactive before toggling.
     *
     * If both parameters are provided, the layer toggles automatically.
     */
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
