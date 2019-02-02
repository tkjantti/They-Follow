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
/* global MUSIC */
/* global Map */
/* global LOADER */
/* global GHOST */
/* global PLAYER */

(function () {
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

    function createMap(mapData) {
        numberOfArtifactsCollected = 0;

        let createFunctions = {
            '@': PLAYER.create,
            'A': createArtifact,
            'a': createArtifact,
            'G': GHOST.create,
        };
        let layers = {
            ground: [' ', 'G', '@', 'a'],
            wall: ['='],
            blocker: ['#', 'A'],
            solid: ['O'],
        };
        LOADER.loadMap(mapData, map, layers, createFunctions);
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

    function startLevel() {
        createMap(maps[mapIndex]);
        MUSIC.playTune("main");
    }

    function startGame() {
        if (gameStarted) {
            return;
        }

        startLevel();
        gameStarted = true;
        const loop = createGameLoop();
        loop.start();
    }

    function bindKeys() {
        kontra.keys.bind('enter', () => {
            // Start the game when enter is pressed.
            if (!gameStarted) {
                startGame();
            }

            // Restart the level when enter is pressed.
            if (map.player.dead) {

                // If no more lives, restart the whole game.
                if (lives <= 0) {
                    mapIndex = 0;
                    lives = MAX_LIVES;
                }

                startLevel();
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
                map.adjustCamera(map.player, PLAYER.getSpeed());

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

                // @if DEBUG
                startGame();
                // @endif
            });
    }

    main();
})();
