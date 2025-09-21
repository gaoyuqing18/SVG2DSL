// 1. 新增引入babel模块（关键：添加这行）
const gulp = require('gulp');
const concat = require('gulp-concat');
const useref = require('gulp-useref');
const replace = require('gulp-replace');
const cachebust = require('gulp-cache-bust');
const minify = require('gulp-minify');
const babel = require('gulp-babel'); // 新增：引入gulp-babel插件

gulp.task('js', function () {
  return gulp.src([
    'src/js/*.js', 
    'src/lib/*.js',
    '!src/js/all.js'  // 关键：排除可能误存的产物文件，避免重复处理
  ]) 
    // 步骤1：先对每个文件单独转ES5（确保每个文件的const/let都被转换）
    .pipe(babel()) 
    // 步骤2：再合并为all.js（此时合并的已是ES5代码）
    .pipe(concat('all.js')) 
    // 可选：添加压缩（验证转换后再启用，避免干扰排查）
    // .pipe(minify({ext: {src: '.js', min: '.min.js'}}))
    .pipe(gulp.dest('dist'));
});

// 以下为原有任务，无需修改（保持不变）
gulp.task('css', function () {
  return gulp.src('src/css/*.css')
    .pipe(concat('all.css'))
    .pipe(replace('url(../images/', 'url(http://39.106.255.236/images/'))
    .pipe(gulp.dest('dist'));
});

gulp.task('loading', function () {
  return gulp.src('src/js/loading.js')
    .pipe(babel()) // 可选：若loading.js有ES6代码，也添加babel转换
    .pipe(gulp.dest('dist'));
});

gulp.task('index', function () {
  return gulp.src('src/*.html')
    .pipe(useref())
    .pipe(cachebust({type: 'timestamp'}))
    .pipe(replace('href="all.css"', 'href="http://39.106.255.236/all.css"'))
    .pipe(gulp.dest('dist'));
});

gulp.task('cache', function(){
  return gulp.src(['./src/serviceworker.js'])
    .pipe(replace('<timestamp>', Date.now()))
    .pipe(babel()) // 可选：若serviceworker.js有ES6代码，添加babel转换
    .pipe(gulp.dest('./dist/'));
});

gulp.task('manifest', function(){
  return gulp.src(['./src/site.webmanifest'])
    .pipe(gulp.dest('./dist/'));
});

gulp.task('images', function(){
  return gulp.src(['src/images/**/*'])
    .pipe(gulp.dest('dist/images'));
});

gulp.task('extensions', function(){
  return gulp.src(['src/extensions/**/*'])
    .pipe(gulp.dest('dist/extensions'));
});

gulp.task('shapelib', function(){
  return gulp.src(['src/shapelib/**/*'])
    .pipe(gulp.dest('dist/shapelib'));
});

// 修改canvg任务：若canvg.js/rgbcolor.js有ES6代码，添加babel转换
gulp.task('canvg', function(){
  return gulp.src(['src/js/lib/canvg.js', 'src/js/lib/rgbcolor.js'])
    .pipe(babel()) // 新增：转换该任务中的JS文件
    .pipe(gulp.dest('dist/js/lib'));
});

// build任务保持不变（自动执行所有子任务）
gulp.task('build', 
  gulp.series(
      'css', 
      'js', 
      'index', 
      'manifest',
      'images',
      'extensions',
      'shapelib',
      'canvg'
  )
);