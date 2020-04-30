/**
 * Build styles
 */
require('./index.css').toString();

const RecordRTC = require('recordrtc/RecordRTC');
//const ml5 = require('ml5');
// const smartcrop = require("smartcrop");
// const Bezier = require('bezier-js')
// const ssim = require("ssim.js").default;
const faceapi = require("face-api.js/dist/face-api");
console.log(faceapi.nets.tinyFaceDetector)
    /**
     * RecordScreen Tool for the Editor.js 2.0
     */
class RecordScreen {

    static get toolbox() {
        return {
            title: '录屏',
            icon: require('./../assets/icon.svg').default,
        };
    }

    constructor({ data, api, config }) {

        this.data = data;
        this.api = api;

        this.config = config || {};
        this.config.output = this.config.output || null;

        this.index = this.api.blocks.getCurrentBlockIndex() + 1;

        this.wrapper = {
            block: document.createElement('div'),
            renderSettings: document.createElement('div')
        };

        this.video = null;
        this.recorder = null;
        this.userStream = null;
        this.screenStream = null;

        //摄像头输出的尺寸 方形
        this.userStreamSize = 400;

        //用来存储 帧画面的焦点
        this.framesCenter = [];
        this.count = 0;
        //结果
        this.frames = [];

        /**
         * Styles
         */
        this.CSS = {
            baseClass: this.api.styles.block,
            loading: this.api.styles.loader,
            input: this.api.styles.input,
            button: this.api.styles.button,
            settingsButton: this.api.styles.settingsButton,
            settingsButtonActive: this.api.styles.settingsButtonActive,
            /**
             * Tool's classes
             */
            wrapperBlock: 'record-screen',
            blockTag: 'tag',
            video: 'record-video'

        };

    }

    get title() {
        return "录屏"
    }

    render() {
        this.wrapper.block = document.createElement('div');
        this.wrapper.block.setAttribute("data-title", this.title);
        this.wrapper.block.classList.add(this.CSS.wrapperBlock);
        this.wrapper.block.classList.add(this.CSS.blockTag);

        //按钮
        this.wrapper.block.appendChild(this._createStartBtn());
        //录屏显示的video
        this.wrapper.block.appendChild(this._createVideo());

        let c = this._createCanvas(400, 200);
        this.testC = c;
        this.wrapper.block.appendChild(c.canvas);
        return this.wrapper.block;
    }

    renderSettings() {
        this.wrapper.renderSettings = document.createElement('div');
        return this.wrapper.renderSettings;
    }

    save(blockContent) {
        return this.data
    }


    //显示录屏结果的video
    _createVideo() {
        let div = document.createElement("div");
        div.classList.add(this.CSS.video);
        let video = document.createElement("video");
        //video.classList.add(this.CSS.video);
        video.setAttribute("autoplay", true);
        this.video = video;
        div.appendChild(video);
        return div
    }

    _createStartBtn() {
        let button = document.createElement("button");
        button.classList.add(this.CSS.button);
        button.innerText = "开始录屏";

        let isRecord = false;
        this.api.listeners.on(button, 'click', async(e) => {
            e.preventDefault();
            //开始
            if (isRecord) {
                isRecord = false;
                this._stop();
            } else {
                this.video.parentElement.classList.add(this.CSS.loading);
                //this.wrapper.block.classList.remove(this.CSS.blockTag);
                this.video.muted = true;

                let streams = await this._initMediaDevices();

                this.recorder = RecordRTC(streams, {
                    type: 'video',
                    mimeType: 'video/webm',
                    previewStream: (s) => {
                        this.video.srcObject = s;
                        if (this.video.srcObject) {
                            isRecord = true;
                            button.innerText = "暂停";

                            setTimeout(() => {
                                //console.log(this.video.srcObject)
                                this.video.srcObject.oninactive = e => {
                                    e.preventDefault();
                                    isRecord = false;
                                    button.innerText = "开始录屏";
                                    this._stop();
                                };
                                this.video.parentElement.classList.remove(this.CSS.loading);
                                //this.wrapper.block.classList.add(this.CSS.blockTag);
                            }, 800);

                        } else {
                            this.video.parentElement.classList.remove(this.CSS.loading);
                        }
                    }
                });

                this.recorder.startRecording();

            }

        });
        return button;
    }

    _keepStreamActive(stream) {
        var video = document.createElement('video');
        video.muted = true;
        video.srcObject = stream;
        video.setAttribute('autoplay', true);
        //video.style.display = 'none';
        video.style.position = "fixed";
        video.style.top = '0px';
        video.style.opacity = 0;
        video.style.zIndex = -22;
        this.wrapper.block.appendChild(video);
        return video
    }

    async _initMediaDevices() {
        let userStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: 24
            },
            audio: true
        });
        //console.log(userStream.width, userStream.height)

        let screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        screenStream.width = window.screen.width;
        screenStream.height = window.screen.height;
        screenStream.fullcanvas = true;

        userStream.width = 1280;
        userStream.height = 720;

        let screenVideo = this._keepStreamActive(screenStream);
        this.userVideo = this._keepStreamActive(userStream);

        this.screenStream = screenStream;
        this.userStream = userStream;

        screenStream.oninactive = () => {
            this._stop();
        }
        userStream.oninactive = () => {
            this._stop();
        }


        //把用户摄像头的视频流 经过过 canvas处理
        let userCanvas = document.createElement('canvas');
        userCanvas.width = userStream.width;
        userCanvas.height = userStream.height;

        this.context = userCanvas.getContext('2d');

        //this.wrapper.block.appendChild(userCanvas);

        var canvasStream = userCanvas.captureStream(15);
        var newUserStream = new MediaStream();
        newUserStream.width = this.userStreamSize;
        newUserStream.height = this.userStreamSize;
        newUserStream.top = screenStream.height - this.userStreamSize;;
        newUserStream.left = screenStream.width - this.userStreamSize;;

        // "getTracks" is RecordRTC's built-in function
        RecordRTC.getTracks(canvasStream, 'video').forEach(function(videoTrack) {
            newUserStream.addTrack(videoTrack);
        });
        // "getTracks" is RecordRTC's built-in function
        RecordRTC.getTracks(userStream, 'audio').forEach(function(audioTrack) {
            newUserStream.addTrack(audioTrack);
        });


        this.recorder = 1;

        window.requestAnimationFrame(async() => {
            await this._compute();
        })

        window.requestAnimationFrame(async() => {
            await this._video2Stream(0);
        });

        return [screenStream, newUserStream]
    }

    _createCanvas(w, h) {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        let ctx = canvas.getContext('2d');
        return ctx;
    }

    // Convert a ImageData to a Canvas
    _imageDataToCanvas(imageData, x, y) {
        // console.log(raws, x, y)
        const arr = Array.from(imageData);

        const ctx = this._createCanvas(x, y);

        const imgData = ctx.createImageData(x, y);
        const { data } = imgData;

        for (let i = 0; i < x * y * 4; i += 1) data[i] = arr[i];
        ctx.putImageData(imgData, 0, 0);

        return ctx.canvas;
    };

    async _bodypix(orginCanvas) {
        let bodypix = await ml5.bodyPix();
        //console.log(bodypix)
        let segmentation = await bodypix.segment(orginCanvas);
        console.log(segmentation)
        let ctx = this._createCanvas(orginCanvas.width, orginCanvas.height);
        ctx.drawImage(orginCanvas, 0, 0);

        let maskedBackground = await this._imageDataToCanvas(segmentation.raw.backgroundMask.data, segmentation.raw.backgroundMask.width, segmentation.raw.backgroundMask.height)

        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(maskedBackground, 0, 0);

        return ctx.canvas;

    }

    async _compute() {

        if (!this.recorder) return; // ignore/skip on stop-recording
        //用来计算的，缩小 ，加快运算速度
        let video = this.userVideo,
            width = this.userStream.width,
            height = this.userStream.height,
            size = this.userStreamSize;

        let computeWidth = 200,
            computeHeigth = ~~(height * computeWidth / width);
        let ctxForCompute = this._createCanvas(computeWidth, computeHeigth);
        ctxForCompute.drawImage(video, 0, 0, computeWidth, computeHeigth);

        await this._loadModel();
        let img = await this._loadImg(ctxForCompute.canvas.toDataURL());
        let result = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions());
        let box = {};
        if (result && result.box) {

            box = {
                x: result.box.x * width / computeWidth,
                y: result.box.y * width / computeWidth,
                width: result.box.width * width / computeWidth,
                height: result.box.height * width / computeWidth
            };
        } else if (this.frames.length > 0) {
            box = this.frames[0];
        } else {
            box = {
                x: ~~((width - size) / 2),
                y: ~~((height - size) / 2),
                width: size,
                height: size
            }

        }

        let ctx = this._createCanvas(width, height);
        ctx.drawImage(video, 0, 0, width, height);
        console.log({...box })
        this.frames.unshift({...box, canvas: ctx.canvas, ctx: ctxForCompute });

        window.requestAnimationFrame(async() => {
            await this._compute();
        });

    }

    async _loadImg(_url) {
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.src = _url;
            // console.log(str);
            img.onload = function() {
                resolve(img);
            };
        });
    };

    async _loadModel() {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
            await faceapi.loadTinyFaceDetectorModel(this.config.modelPath);
        }
    }

    async _centerVideo() {

        /*
         * @todo 抖动
         */

        if (this.frames.length == 0) return;
        //取出最近的
        let frame = this.frames.pop();
        if (this.frames.length > 0) {

            // let bframe = this.frames[this.frames.length - 1];

            // const { mssim, performance } = ssim(bframe.canvas.getContext('2d').getImageData(0, 0, this.userStream.width, this.userStream.height), frame.canvas.getContext('2d').getImageData(0, 0, this.userStream.width, this.userStream.height));

            // if (mssim > 0.9) {

            // }
            //console.log(`SSIM: ${mssim} (${performance}ms)`);
        }

        // if (this.frames.length >= 2) {

        //     this.count++;
        //     this.testC.canvas.width = width;
        //     this.testC.canvas.style.width = "70%";
        //     this.testC.canvas.height = height;

        //     this.testC.strokeStyle = 'green';
        //     let h = result.topCrop.height,
        //         w = h,
        //         y = 0;
        //     // console.log('-----', x, y, w, h);
        //     this.testC.strokeRect(nx, y, w, h);
        //     this.testC.strokeStyle = "red";
        //     this.testC.strokeRect(result.topCrop.x - padding, result.topCrop.y - padding, result.topCrop.width + padding * 2, result.topCrop.height + padding * 2);

        // }


        //裁切
        let padding = 4;
        let ctxBox = this._createCanvas(frame.width, frame.height);
        ctxBox.canvas.width = frame.width + padding * 2;
        ctxBox.canvas.height = frame.height + padding * 2;
        ctxBox.drawImage(frame.canvas, frame.x - padding, frame.y - padding, frame.width + padding * 2, frame.height + padding * 2, 0, 0, ctxBox.canvas.width, ctxBox.canvas.height);
        //this.wrapper.block.appendChild(ctxBox.canvas);
        console.log(frame)
            //水平翻转
        var img_data = ctxBox.getImageData(0, 0, ctxBox.canvas.width, ctxBox.canvas.height),
            i, i2, t,
            h = img_data.height,
            w = img_data.width,
            w_2 = w / 2;
        for (var dy = 0; dy < h; dy++) {
            for (var dx = 0; dx < w_2; dx++) {
                i = (dy << 2) * w + (dx << 2)
                i2 = ((dy + 1) << 2) * w - ((dx + 1) << 2)
                for (var p = 0; p < 4; p++) {
                    t = img_data.data[i + p]
                    img_data.data[i + p] = img_data.data[i2 + p]
                    img_data.data[i2 + p] = t
                }
            }
        }
        ctxBox.putImageData(img_data, 0, 0);

        return ctxBox.canvas;
    }

    async _video2Stream(tries) {
        console.log(this.frames.length)
        if (!this.recorder) return; // ignore/skip on stop-recording
        if (tries > 10 && this.frames.length > 0) {

            //使用bodypix处理摄像头视频
            // let ctx = this._createCanvas(this.userStream.width * 0.2, this.userStream.height * 0.2);
            // ctx.drawImage(this.userVideo, 0, 0, this.userStream.width * 0.2, this.userStream.height * 0.2);
            // let bc = await this._bodypix(ctx.canvas);

            //使用传参的方式处理摄像头视频,使人物居中
            let bc = await this._centerVideo();
            if (bc) {
                this.context.clearRect(0, 0, this.userStream.width, this.userStream.height);
                this.context.drawImage(bc, 0, 0, this.userStream.width, this.userStream.height);
            }

            //this.context.fillRect(10, 10, 10, 10);
            //console.log(this.userVideo.videoHeight, this.context.canvas.height, this.userStream.height)
        } else {
            tries += 1;
        };
        // repeat (looper)
        // setTimeout(async() => {
        //     await this._video2Stream(tries);
        // }, 100);
        window.requestAnimationFrame(async() => {
            await this._video2Stream(tries);
        });
    }

    async _startRecord() {

        let streams = await this._initMediaDevices();

        // this.recorder = new RecordRTC(userStream, {
        //     recorderType: 'video',
        //     width: 640,
        //     height: 480,
        //     frameRate: 24,
        //     // workerPath: '../libs/webm-worker.js',
        //     // webAssemblyPath: '../libs/webm-wasm.wasm',
        // });

        // console.log(recorder)
        // const sleep = m => new Promise(r => setTimeout(r, m));
        // await sleep(3000);

        // await recorder.stopRecording();
        // let blob = await recorder.getBlob();
        // invokeSaveAsDialog(blob);

        // var displayMediaOptions = {
        //     video: true,
        //     // audio: true,   not support
        //     cursor: 'always'
        // }
        // let captureStream = null;
        // try {
        //     captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        // } catch (err) {
        //     console.error("Error: " + err);
        //     this._stop();
        // }
        // return captureStream;
    }

    _stop() {
        if (this.video && this.video.srcObject) {
            let tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        };
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
        };
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }
        this.recorder = null;
    };




}

module.exports = RecordScreen;