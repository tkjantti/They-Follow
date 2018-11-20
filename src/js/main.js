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

/* global maps */
/* global VECTOR */
/* global MUSIC */
/* global Map */
/* global LOADER */
/* global GHOST */

(function () {
    const clamp = VECTOR.clamp;

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

    let lives = MAX_LIVES;

    let mapIndex = 0;
    let map = new Map();

    let numberOfArtifactsCollected = 0;

    function mapIsFinished() {
        return numberOfArtifactsCollected === map.artifactCount;
    }

    function gameIsFinished() {
        return mapIndex >= (maps.length - 1);
    }

    function createArtifact(map, position) {
        return kontra.sprite({
            type: 'item',
            position: position,
            image: kontra.assets.images.artifact,
        });
    }

    function createPlayer(map, position) {
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
            'G': GHOST.create,
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
                MUSIC.playTune("main");
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
                MUSIC.playTune("main");
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
                MUSIC.playTune("end");
                lives--;
            }

            if ((sprite.type === 'item') &&
                map.player.collidesWith(sprite)) {
                sprite.dead = true;
                numberOfArtifactsCollected++;
                MUSIC.playTune("eat");
            }
        }
    }

    function startWinningAnimation() {
        map.entities.filter(e => e.hasOwnProperty('startWinningAnimation')).forEach((e, i) => {
            e.startWinningAnimation(i);
        });
    }

    function createGameLoop() {
        return kontra.gameLoop({
            update() {
                map.update();
                map.adjustCamera(map.player, playerSpeed);

                checkCollisions();

                if (mapIsFinished()) {
                    if (mapIndex < maps.length - 1) {
                        createMap(maps[++mapIndex]);
                    } else if (1500 < (performance.now() - map.startTime)) {
                        startWinningAnimation();
                    }
                }

                GHOST.winningAnimationAngle += 0.005; // Update winning animation
            },

            render() {
                let time = performance.now() - map.startTime;
                let cx = kontra.context;

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

    function main() {
        kontra.init();
        drawStatusText(kontra.context,beginingText);

        MUSIC.initialize();

        kontra.assets.imagePath = 'images';
        kontra.assets.load('tilesheet.png', 'artifact.png', 'ghost.png', 'player.png')
            .then(() => {
                drawInfoText(kontra.context,readyText);
                bindKeys();
            });
    }

    main();
})();
