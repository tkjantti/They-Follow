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

/* global CPlayer, maps */
/* global VECTOR */
/* global SONGS */

(function () {
    const clamp = VECTOR.clamp;

    //----------------------------------------------------------------------------
    // Music data section
    //----------------------------------------------------------------------------
    const mainTune = document.createElement("audio");
    const eatTune = document.createElement("audio");
    const endTune = document.createElement("audio");

    const playerSpeed = 1.5;
    const diagonalSpeedCoefficient = 0.707;

    const TILE_WIDTH = 32;
    const TILE_HEIGHT = 32;

    const TILE_GROUND = 1;
    const TILE_WALL = 3;
    const TILE_BLOCKER = 4;

    const ONLINE_TOGGLE_DELAY = 1200;

    const LAYER_GROUND = 'G';
    const LAYER_FLASHING = 'F';
    const LAYER_BLOCKERS = 'B';
    const LAYER_WALLS = 'W';

    const HELP_TEXT_DISPLAY_TIME = 3000;

    const MAX_LIVES = 5;

    const beginingText = "THEY FOLLOW";

    const readyText = "Press enter";

    let gameStarted = false;


    // Texts shown when winning the game.
    const finalTexts = [
        "YOU DID IT",
        "YOU FINISHED 'THEY FOLLOW'",
        "A JS13KGAMES 2018 ENTRY",
        "", // a pause
        "AUTHORS:",
        "TERO JÄNTTI",
        "SAMI HEIKKINEN",
        "",
        "THANK YOU:",
        "STRAKER - KONTRA LIBRARY",
        "BITS'N'BITES - SOUNDBOX",
        "SHREYAS MINOCHA - JS13K-BOILERPLATE",
        "THE WHOLE JS13KGAMES COMMUNITY :)",
        "",
        "THANKS FOR PLAYING!",
        ""
    ];

    let cx; // Convas context

    let lives = MAX_LIVES;

    let mapIndex = 0;
    let currentMap;

    let tileEngine;

    let sprites = [];

    let player;

    let artifactCount;
    let numberOfArtifactsCollected = 0;

    let online;

    // When online mode was requested on/off (it takes a little time to toggle it).
    let onlineToggleSwitchTime;

    // Last time when online mode was toggled on/off.
    let onlineLatestToggleTime;

    // How long to wait until next on/off toggle.
    let onlineToggleWaitTime;

    let levelStartTime;

    // Angle for the ghosts in the winning animation.
    let ghostAngle = 0;

    function resetLevel() {
        sprites = [];
        online = true;
        onlineToggleSwitchTime = null;
        onlineLatestToggleTime = levelStartTime = performance.now();
    }

    function mapIsFinished() {
        return numberOfArtifactsCollected === artifactCount;
    }

    function gameIsFinished() {
        return mapIndex >= (maps.length - 1);
    }

    function getMovementBetween(spriteFrom, spriteTo) {
        let fromX = spriteFrom.x + spriteFrom.width / 2;
        let fromY = spriteFrom.y + spriteFrom.height / 2;
        let toX = spriteTo.x + spriteTo.width / 2;
        let toY = spriteTo.y + spriteTo.height / 2;

        return kontra.vector(toX - fromX, toY - fromY);
    }

    function collidesWithLayer(sprite, layer) {
        let cameraCoordinateBounds = {
            x: -tileEngine.sx + sprite.x,
            y: -tileEngine.sy + sprite.y,
            width: sprite.width,
            height: sprite.height
        };
        return tileEngine.layerCollidesWith(layer, cameraCoordinateBounds);
    }

    function collidesWithBlockers(sprite) {
        return online && collidesWithLayer(sprite, LAYER_BLOCKERS);
    }

    function createArtifact(position) {
        return kontra.sprite({
            type: 'item',
            position: position,
            image: kontra.assets.images.artifact,
        });
    }

    function createGhost(position, number) {
        return kontra.sprite({
            type: 'ghost',
            position: position,
            number: number,
            image: kontra.assets.images.ghost,

            // Adds some variance to how the ghosts approach the player.
            relativeDir: kontra.vector.getRandomDir(),

            update() {
                let movement = null;

                if (collidesWithBlockers(this)) {
                    this.color = 'yellow';
                    let randomDirection = kontra.vector(
                        (-0.5 + Math.random()) * 20,
                        (-0.5 + Math.random()) * 20);
                    this.move(randomDirection);
                    return;
                } else if (this.color !== 'red') {
                    this.color = 'red';
                }

                if (this._target) {
                    if (1000 < performance.now() - this._targetBegin) {
                        this._target = null;
                        this._targetBegin = null;
                    } else {
                        movement = this._target.minus(this.position).normalized();
                    }
                } else if (gameIsFinished() && 1500 < (performance.now() - levelStartTime)) {
                    let angle = ghostAngle + this.number * 0.3;
                    let r = 180 + Math.sin(ghostAngle * 10) * 30;
                    let target = player.position.plus(
                        kontra.vector(Math.cos(angle) * r, Math.sin(angle) * r));
                    movement = target.minus(this.position).normalized();
                } else if (!player.dead) {
                    let target = this._getPlayerTarget();
                    if (target) {
                        movement = target.minus(this.position).normalized();
                    }
                }

                if (movement) {
                    let newBounds = {
                        x: this.x + movement.x,
                        y: this.y + movement.y,
                        width: this.width,
                        height: this.height,
                    };

                    if (!collidesWithBlockers(newBounds)) {
                        this.move(movement);
                    } else {
                        let newTarget = kontra.vector(this.x, this.y);

                        // Back off a little.
                        newTarget.x -= movement.x * 5;
                        newTarget.y -= movement.y * 5;

                        let toPlayer = getMovementBetween(this, player);
                        let dodgeHorizontally = Math.abs(toPlayer.x) < Math.abs(toPlayer.y);
                        let dodgeAmount = 50;

                        if (dodgeHorizontally) {
                            newTarget.x += (Math.random() >= 0.5) ? dodgeAmount : -dodgeAmount;
                        } else {
                            newTarget.y += (Math.random() >= 0.5) ? dodgeAmount : -dodgeAmount;
                        }

                        this._target = newTarget;
                        this._targetBegin = performance.now();
                    }
                }
            },

            // Moves by the given vector, keeping within level bounds.
            move(movement) {
                let newPosition = kontra.vector(
                    clamp(this.x + movement.x, 0, tileEngine.mapwidth - this.width),
                    clamp(this.y + movement.y, 0, tileEngine.mapheight - this.height));
                this.position = newPosition;
            },

            /*
             * Returns the position for approaching the player or null
             * if the player is too far.
             */
            _getPlayerTarget() {
                let distanceToPlayer = VECTOR.getDistance(this.position, player.position);
                if (distanceToPlayer > 400) {
                    return null;
                }

                let target = kontra.vector(
                    player.x + player.width / 2,
                    player.y + player.height / 2);

                // When offline, approach the player from different
                // directions so that the ghosts don't slump together
                // and give a feeling of surrounding the player.
                if (!online && distanceToPlayer > 140) {
                    target.x += this.relativeDir.x * 130;
                    target.y += this.relativeDir.y * 130;
                }

                return target;
            },
        });
    }

    function createPlayer(position) {
        return kontra.sprite({
            type: 'player',
            position: position,
            image: kontra.assets.images.player,

            collidesWith(other) {
                return this.x < other.x + other.width &&
                    this.x + this.width > other.x &&
                    this.y < other.y + other.height &&
                    this.y + this.height > other.y;
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

                let newBounds = {
                    // keep within the map
                    x: clamp(this.x + xDiff, 0, tileEngine.mapwidth - this.width),
                    y: clamp(this.y + yDiff, 0, tileEngine.mapheight - this.height),

                    width: this.width,
                    height: this.height,
                };

                if (!collidesWithLayer(newBounds, LAYER_WALLS)) {
                    this.position = kontra.vector(newBounds.x, newBounds.y);
                } else if (xDiff && yDiff) {
                    // Check if can move horizontally.
                    newBounds = {
                        x: clamp(this.x + xDiff, 0, tileEngine.mapwidth - this.width),
                        y: this.y,
                        width: this.width,
                        height: this.height,
                    };
                    if (!collidesWithLayer(newBounds, LAYER_WALLS)) {
                        this.position = kontra.vector(newBounds.x, newBounds.y);
                    } else {
                        // Check if can move vertically.
                        newBounds = {
                            x: this.x,
                            y: clamp(this.y + yDiff, 0, tileEngine.mapheight - this.height),
                            width: this.width,
                            height: this.height,
                        };
                        if (!collidesWithLayer(newBounds, LAYER_WALLS)) {
                            this.position = kontra.vector(newBounds.x, newBounds.y);
                        }
                    }
                }
            },
        });
    }

    function findPositionsOf(map, element) {
        let result = [];
        let data = map.data;

        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            let row = data[rowIndex];
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                if (row[colIndex] === element) {
                    result.push(kontra.vector(colIndex * TILE_WIDTH, rowIndex * TILE_HEIGHT));
                }
            }
        }

        return result;
    }

    function mapToLayer(map, convert) {
        return map.data.reduce((total, current) => total + current).split('').map(convert);
    }

    function createMap(map) {
        resetLevel();

        currentMap = map;

        onlineToggleWaitTime = map.online;

        const blockerData = mapToLayer(
            map, tile => (tile === '#' || tile === 'A') ? TILE_BLOCKER : 0);

        tileEngine = kontra.tileEngine({
            tilewidth: TILE_WIDTH,
            tileheight: TILE_HEIGHT,
            width: map.data[0].length,
            height: map.data.length,
            tilesets: [{
                firstgid: 1,
                image: kontra.assets.images.tilesheet,
            }],
            layers: [{
                name: LAYER_GROUND,
                data: mapToLayer(
                    map,
                    tile => (tile === ' ' || tile === 'G' || tile === '@' || tile === 'a') ? TILE_GROUND : 0),
            }, {
                name: LAYER_WALLS,
                data: mapToLayer(map, tile => tile === '=' ? TILE_WALL : 0),
            }, {
                name: LAYER_FLASHING,
                data: blockerData,
            }, {
                name: LAYER_BLOCKERS,
                data: blockerData,
            }],
        });

        let playerPosition = findPositionsOf(map, '@')[0];
        playerPosition.x += 5;
        player = createPlayer(playerPosition);
        sprites.push(player);

        let artifactPositions = findPositionsOf(map, 'A').concat(findPositionsOf(map, 'a'));
        artifactCount = artifactPositions.length;
        numberOfArtifactsCollected = 0;
        artifactPositions.forEach(pos => {
            pos.x += 5;
            pos.y += 5;
            let artifact = createArtifact(pos);
            sprites.push(artifact);
        });

        findPositionsOf(map, 'G').forEach((pos, i) => {
            let ghost = createGhost(pos, i);
            sprites.push(ghost);
        });
    }

    function drawStatusText(cx, text) {
        cx.fillStyle = 'white';
        cx.font = "20px Sans-serif";
        cx.fillText(text, kontra.canvas.width * 0.35, 40);
    }

    function drawInfoText(cx, text) {
        cx.fillStyle = 'white';
        cx.font = "22px Sans-serif";
        let textWidth = text.length * 14;
        cx.fillText(text, kontra.canvas.width / 2 - textWidth / 2, 120);
    }

    function bindKeys() {
        kontra.keys.bind('enter', () => {
            // Start the level when enter is pressed.
            if (!gameStarted) {
                createMap(maps[mapIndex]);
                gameStarted = true;
                playTune("main");
                const loop = createGameLoop();
                loop.start();
            }

            // Restart the level when enter is pressed.
            if (player.dead) {

                // If no more lives, restart the whole game.
                if (lives <= 0) {
                    mapIndex = 0;
                    lives = MAX_LIVES;
                }

                createMap(maps[mapIndex]);
                playTune("main");
            }
        });
    }

    function adjustCamera() {
        const margin = 200;
        const cameraSpeed = playerSpeed;

        if (player.x - tileEngine.sx < margin) {
            tileEngine.sx -= cameraSpeed;
        } else if ((tileEngine.sx + kontra.canvas.width) - player.x < margin) {
            tileEngine.sx += cameraSpeed;
        }

        if (player.y - tileEngine.sy < margin) {
            tileEngine.sy -= cameraSpeed;
        } else if ((tileEngine.sy + kontra.canvas.height) - player.y < margin) {
            tileEngine.sy += cameraSpeed;
        }
    }

    function checkCollisions() {
        for (let i = 0; i < sprites.length; i++) {
            let sprite = sprites[i];

            if ((sprite.type === 'ghost') &&
                (sprite.color !== 'yellow') &&
                player.collidesWith(sprite) &&
                !player.dead &&
                !mapIsFinished()) {
                player.dead = true;
                playTune("end");
                lives--;
            }

            if ((sprite.type === 'item') &&
                player.collidesWith(sprite)) {
                sprite.dead = true;
                numberOfArtifactsCollected++;
                playTune("eat");
            }
        }
    }

    function createGameLoop() {
        return kontra.gameLoop({
            update() {
                for (let i = 0; i < sprites.length; i++) {
                    let sprite = sprites[i];
                    sprite.update();
                }

                checkCollisions();

                adjustCamera();

                let now = performance.now();

                if (onlineToggleWaitTime < (now - onlineLatestToggleTime)) {
                    onlineToggleSwitchTime = now;
                    onlineLatestToggleTime = now;
                    onlineToggleWaitTime = online ? currentMap.offline : currentMap.online;
                }

                if (onlineToggleSwitchTime &&
                    ONLINE_TOGGLE_DELAY < (now - onlineToggleSwitchTime)) {
                    online = !online;
                    onlineToggleSwitchTime = null;
                }

                if (mapIsFinished() && (mapIndex < maps.length - 1)) {
                    createMap(maps[++mapIndex]);
                }

                sprites = sprites.filter(s => !s.dead);

                ghostAngle += 0.005; // Update winning animation
            },

            render() {
                let time = performance.now() - levelStartTime;

                tileEngine.renderLayer(LAYER_GROUND);
                tileEngine.renderLayer(LAYER_WALLS);
                if (onlineToggleSwitchTime && (Math.random() >= 0.5)) {
                    tileEngine.renderLayer(LAYER_FLASHING);
                }
                if (online && !onlineToggleSwitchTime) {
                    tileEngine.renderLayer(LAYER_BLOCKERS);
                }

                cx.save();
                cx.translate(-tileEngine.sx, -tileEngine.sy);
                for (let i = 0; i < sprites.length; i++) {
                    let sprite = sprites[i];
                    sprite.render();
                }
                cx.restore();

                if (artifactCount) {
                    drawStatusText(cx, `A: ${numberOfArtifactsCollected} / ${artifactCount}             L: ${lives}`);
                }

                if (player.dead) {
                    drawInfoText(cx, (lives > 0) ? "TRY AGAIN (ENTER)" : "GAME OVER! (ENTER)");
                } else if ((time < HELP_TEXT_DISPLAY_TIME) && currentMap.text) {
                    drawInfoText(cx, currentMap.text);
                }

                if (gameIsFinished() && 2 * HELP_TEXT_DISPLAY_TIME < time) {
                    let i = Math.floor((time - 2 * HELP_TEXT_DISPLAY_TIME) / HELP_TEXT_DISPLAY_TIME) % finalTexts.length;
                    drawInfoText(cx, finalTexts[i]);
                }
            }
        });
    }

    function playTune(tune) {
        switch (tune) {
            case "main": {
                mainTune.currentTime = 0;
                mainTune.volume = 0.9;
                var promise = mainTune.play();
                if (promise !== undefined) {
                    promise.then(() => {
                        // Autoplay started!
                    }).catch(error => { // jshint ignore:line
                        // Autoplay was prevented.
                    });
                }
                break;
            }
            case "end": {
                endTune.play();
                var currentVolume = mainTune.volume;
                var fadeOutInterval = setInterval(function () {
                    currentVolume = (parseFloat(currentVolume) - 0.2).toFixed(1);
                    if (currentVolume >= 0.0) {
                        mainTune.volume = currentVolume;
                    } else {
                        mainTune.pause();
                        clearInterval(fadeOutInterval);
                    }
                }, 100);
                break;
            }
            case "eat": { 
                eatTune.play();
                break;
            }
        }
    }
    function initMusicPlayer(audioTrack, tune, isLooped) {
        var songplayer = new CPlayer();
        // Initialize music generation (player).
        songplayer.init(tune);
        // Generate music...
        var done = false;
        setInterval(function () {
            if (done) {
                return;
            }
            done = (songplayer.generate() >= 1);
            if (done) {
                // Put the generated song in an Audio element.
                var wave = songplayer.createWave();
                audioTrack.src = URL.createObjectURL(new Blob([wave], { type: "audio/wav" }));
                audioTrack.loop = isLooped;
                //audioTrack.play();
            }
        }, 0);
    }

    function main() {
        kontra.init();
        cx = kontra.context;
        drawStatusText(cx,beginingText);

        initMusicPlayer(mainTune, SONGS.song, true);
        initMusicPlayer(eatTune, SONGS.eatEffect, false);
        initMusicPlayer(endTune, SONGS.endSong, false);

        kontra.assets.imagePath = 'images';
        kontra.assets.load('tilesheet.png', 'artifact.png', 'ghost.png', 'player.png')
            .then(() => {
                drawInfoText(cx,readyText);
                bindKeys();
            });
    }

    main();
})();
