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

/* global CPlayer */
/* global SONGS */

/* exported MUSIC */

const MUSIC = {};

(function (exports) {
    "use strict";

    const mainTune = document.createElement("audio");
    const eatTune = document.createElement("audio");
    const endTune = document.createElement("audio");

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
            }
        }, 0);
    }

    exports.initialize = function () {
        initMusicPlayer(mainTune, SONGS.song, true);
        initMusicPlayer(eatTune, SONGS.eatEffect, false);
        initMusicPlayer(endTune, SONGS.endSong, false);
    };

    exports.playTune = function (tune) {
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
    };
})(MUSIC);
