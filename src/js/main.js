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
/* global Map */
/* global LOADER */

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

    let cx; // Canvas context

    let lives = MAX_LIVES;

    let mapIndex = 0;
    let map = new Map();

    let numberOfArtifactsCollected = 0;

    // Angle for the ghosts in the winning animation.
    let ghostAngle = 0;

    function mapIsFinished() {
        return numberOfArtifactsCollected === map.artifactCount;
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

                if (map.collidesWithBlockers(this)) {
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
                } else if (gameIsFinished() && 1500 < (performance.now() - map.startTime)) {
                    let angle = ghostAngle + this.number * 0.3;
                    let r = 180 + Math.sin(ghostAngle * 10) * 30;
                    let target = map.player.position.plus(
                        kontra.vector(Math.cos(angle) * r, Math.sin(angle) * r));
                    movement = target.minus(this.position).normalized();
                } else if (!map.player.dead) {
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

                    if (!map.collidesWithBlockers(newBounds)) {
                        this.move(movement);
                    } else {
                        let newTarget = kontra.vector(this.x, this.y);

                        // Back off a little.
                        newTarget.x -= movement.x * 5;
                        newTarget.y -= movement.y * 5;

                        let toPlayer = getMovementBetween(this, map.player);
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
                    clamp(this.x + movement.x, 0, map.width - this.width),
                    clamp(this.y + movement.y, 0, map.height - this.height));
                this.position = newPosition;
            },

            /*
             * Returns the position for approaching the player or null
             * if the player is too far.
             */
            _getPlayerTarget() {
                let distanceToPlayer = VECTOR.getDistance(this.position, map.player.position);
                if (distanceToPlayer > 400) {
                    return null;
                }

                let target = kontra.vector(
                    map.player.x + map.player.width / 2,
                    map.player.y + map.player.height / 2);

                // When offline, approach the player from different
                // directions so that the ghosts don't slump together
                // and give a feeling of surrounding the player.
                if (!map.online && distanceToPlayer > 140) {
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
                    x: clamp(this.x + xDiff, 0, map.width - this.width),
                    y: clamp(this.y + yDiff, 0, map.height - this.height),

                    width: this.width,
                    height: this.height,
                };

                if (!map.collidesWithWalls(newBounds)) {
                    this.position = kontra.vector(newBounds.x, newBounds.y);
                } else if (xDiff && yDiff) {
                    // Check if can move horizontally.
                    newBounds = {
                        x: clamp(this.x + xDiff, 0, map.width - this.width),
                        y: this.y,
                        width: this.width,
                        height: this.height,
                    };
                    if (!map.collidesWithWalls(newBounds)) {
                        this.position = kontra.vector(newBounds.x, newBounds.y);
                    } else {
                        // Check if can move vertically.
                        newBounds = {
                            x: this.x,
                            y: clamp(this.y + yDiff, 0, map.height - this.height),
                            width: this.width,
                            height: this.height,
                        };
                        if (!map.collidesWithWalls(newBounds)) {
                            this.position = kontra.vector(newBounds.x, newBounds.y);
                        }
                    }
                }
            },
        });
    }

    function createMap(mapData) {
        numberOfArtifactsCollected = 0;

        let createFunctions = {
            '@': createPlayer,
            'A': createArtifact,
            'a': createArtifact,
            'G': createGhost,
        };
        LOADER.loadMap(mapData, map, createFunctions);
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
            if (map.player.dead) {

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

    function checkCollisions() {
        for (let i = 0; i < map.entities.length; i++) {
            let sprite = map.entities[i];

            if ((sprite.type === 'ghost') &&
                (sprite.color !== 'yellow') &&
                map.player.collidesWith(sprite) &&
                !map.player.dead &&
                !mapIsFinished()) {
                map.player.dead = true;
                playTune("end");
                lives--;
            }

            if ((sprite.type === 'item') &&
                map.player.collidesWith(sprite)) {
                sprite.dead = true;
                numberOfArtifactsCollected++;
                playTune("eat");
            }
        }
    }

    function createGameLoop() {
        return kontra.gameLoop({
            update() {
                map.update();
                map.adjustCamera(map.player, playerSpeed);

                checkCollisions();

                if (mapIsFinished() && (mapIndex < maps.length - 1)) {
                    createMap(maps[++mapIndex]);
                }

                ghostAngle += 0.005; // Update winning animation
            },

            render() {
                let time = performance.now() - map.startTime;

                map.render(cx);

                if (map.artifactCount) {
                    drawStatusText(cx, `A: ${numberOfArtifactsCollected} / ${map.artifactCount}             L: ${lives}`);
                }

                if (map.player.dead) {
                    drawInfoText(cx, (lives > 0) ? "TRY AGAIN (ENTER)" : "GAME OVER! (ENTER)");
                } else if ((time < HELP_TEXT_DISPLAY_TIME) && map.helpText) {
                    drawInfoText(cx, map.helpText);
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
