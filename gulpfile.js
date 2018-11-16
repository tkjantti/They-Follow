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

gulp.task('cleanDist', () => {
    return gulp.src('dist/*', { read: false })
        .pipe(deleteFiles());
});

gulp.task('buildSourceFiles', () => {
    return gulp.src('src/index.html')
        .pipe(useref())
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
            baseDir: 'src'
        },
        open: false,
    });
});

gulp.task('watchJS', ['lintJS'], browserSync.reload);

gulp.task('watch', ['browserSync'], () => {
    gulp.watch('src/*.html', browserSync.reload);
    gulp.watch('src/css/**/*.css', browserSync.reload);
    gulp.watch('src/js/**/*.js', ['watchJS']);
});

gulp.task('default', ['watch']);
