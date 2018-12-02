/* jshint node:true */
'use strict';

const gulp = require('gulp');
const browserSync = require('browser-sync');
const deleteFiles = require('gulp-rimraf');
const minifyHTML = require('gulp-minify-html');
const minifyCSS = require('gulp-clean-css');
const minifyJS = require('gulp-terser');
const useref = require('gulp-useref');
const gulpIf = require('gulp-if');
const imagemin = require('gulp-imagemin');
const runSequence = require('run-sequence');
const jshint = require('gulp-jshint');
const ghPages = require('gulp-gh-pages');
const preprocess = require('gulp-preprocess');

gulp.task('cleanDist', () => {
    return gulp.src('dist/*', { read: false })
        .pipe(deleteFiles());
});

gulp.task('buildSourceFiles', () => {
    return gulp.src('src/index.html')
        .pipe(useref())
        .pipe(preprocess({context: { DEBUG: false }}))
        .pipe(gulpIf('*.js', minifyJS()))
        .pipe(gulpIf('*.html', minifyHTML()))
        .pipe(gulpIf('*.css', minifyCSS()))
        .pipe(gulp.dest('dist'));
});

gulp.task('optimizeImages', () => {
    return gulp.src('src/images/**')
        .pipe(imagemin())
        .pipe(gulp.dest('dist/images'));
});

gulp.task('lintJS', () => {
    return gulp.src(['src/js/*.js', '!./src/js/kontra.js', '!./src/js/player-small.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('build', callback => {
    runSequence(
        ['lintJS'],
        ['cleanDist'],
        ['buildSourceFiles', 'optimizeImages'],
        callback);
});

gulp.task('deploy', ['build'], function () {
    return gulp.src('./dist/**/*')
        .pipe(ghPages());
});

gulp.task('browserSync', ['lintJS'], () => {
    browserSync({
        server: {
            baseDir: 'debug'
        },
        open: false,
    });
});

gulp.task('copyDebugImages', () => {
    return gulp.src('src/images/**')
        .pipe(gulp.dest('debug/images'));
});

gulp.task('buildDebug', ['lintJS', 'copyDebugImages'], () => {
    return gulp.src('src/index.html')
        .pipe(useref())
        .pipe(preprocess({context: { DEBUG: true }}))
        .pipe(gulp.dest('debug'));
});

gulp.task('watchBuild', ['buildDebug'], browserSync.reload);

gulp.task('watch', ['browserSync', 'watchBuild'], () => {
    gulp.watch('src/*.html', ['watchBuild']);
    gulp.watch('src/css/**/*.css', ['watchBuild']);
    gulp.watch('src/js/**/*.js', ['watchBuild']);
});

gulp.task('default', ['watch']);
