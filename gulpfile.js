var gulp = require("gulp");
var path = require('path');
var less = require("gulp-less");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var watchify = require("watchify");
var tsify = require("tsify");
var fancy_log = require("fancy-log");
var connect = require('gulp-connect');
const SRCDIR = "src";
const DESTDIR = "dist"
var paths = {
    pages:  [`${SRCDIR}/**/*.html`],
    styles: [`${SRCDIR}/**/*.less`],
    ts:     [`${SRCDIR}/**/*.ts`],
    entry:     [`${SRCDIR}/index.ts`],
    staticAssets:  [`${SRCDIR}/*.{png,ico}`, `${SRCDIR}/.htaccess`, `${SRCDIR}/**/*.txt`],
};

gulp.task('connect', function() {
    return connect.server({ root: DESTDIR});
});
function compileJS() {
    return browserify({
        basedir: ".",
        debug: true,
        entries: paths.entry,
        cache: {},
        packageCache: {}
      }).plugin(tsify)
      .transform("babelify", {
        presets: ["es2015"],
        extensions: [".ts"]
      })
}
var watchedBrowserify = watchify(compileJS());

gulp.task("css", function() {
    return gulp.src(paths.styles)
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest(DESTDIR))
});
gulp.task("copy-html", function() {
  return gulp.src(paths.pages).pipe(gulp.dest(DESTDIR));
});

gulp.task('csswatch', function () {
    return gulp.watch(paths.styles, gulp.parallel('css'));
});
gulp.task('htmlwatch', function () {
    return gulp.watch(paths.pages, gulp.parallel('copy-html'));
});

gulp.task('copy-assets', function () {
    return gulp.src(paths.staticAssets)
        .pipe(gulp.dest(DESTDIR));
});

function bundleJS () {
    return watchedBrowserify
      .bundle()
      .on("error", fancy_log)
      .pipe(source("chbs.js"))
      .pipe(gulp.dest(DESTDIR))
      .pipe(connect.reload());
  }
gulp.task('js', bundleJS);
gulp.task('jswatch', bundleJS);

gulp.task('build', gulp.parallel(['copy-html', 'copy-assets', 'css']))

gulp.task("default", gulp.parallel(['connect', 'build', 'htmlwatch', 'jswatch', 'csswatch']));
watchedBrowserify.on("update", bundleJS);
watchedBrowserify.on("log", fancy_log);