'use strict';

angular.module('addressBook.directives', [])
    .directive('qrScanner', ['$timeout', function($timeout) {
        return {
            restrict: 'E',
            scope: {
                ngSuccess: '&ngSuccess',
                ngError: '&ngError',
                ngVideoError: '&ngVideoError'
            },
            link: function(scope, element, attrs) {

                window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

                var headerHeight = 100;
                var footerHeight = 150;    
                var height = attrs.height || window.innerHeight - (headerHeight + footerHeight);
                var width = attrs.width || window.innerWidth;

                console.log("in Width: " + attrs.width + " Height: " + attrs.height);
                console.log("computed Height : " + (window.innerHeight - (headerHeight + footerHeight)) + " Width: " + window.innerWidth);
                console.log("Width: "+width);
                console.log("Height: "+height);

                var video = document.createElement('video');
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                var canvas = document.createElement('canvas');
                canvas.setAttribute('id', 'qr-canvas');
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                canvas.setAttribute('style', 'display:none;');

                angular.element(element).append(video);
                angular.element(element).append(canvas);
                var context = canvas.getContext('2d');

                var videoStream;

                element.on('$destroy', function() {
                    videoStream.stop();
                    videoStream = null;
                });

                var scan = function() {
                    if (videoStream) {
                        context.drawImage(video, 0, 0, 307,250);
                        try {
                            qrcode.decode();
                        } catch(e) {
                            scope.ngError({error: e});
                        }
                    }
                    $timeout(scan, 500);
                }

                var successCallback = function(stream) {
                    video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
                    videoStream = stream;
                    video.play();
                    $timeout(scan, 1000);
                }
                
                var errorCallback = function(e) {
                    scope.ngVideoError({error: e});
                }

                function gotSources(sourceInfos) {
                    var constraints = {
                        audio: false,
                        video: {
                            optional : [
                                { sourceId: "" },
                                { facingMode: "environment" }
                            ]
                        }
                    };

                    for (var i = 0; i != sourceInfos.length; ++i) {
                        var sourceInfo = sourceInfos[i];
                        if (sourceInfo.kind === 'audio') {
                            console.log("We don't care about audio!");
                        } else if (sourceInfo.kind === 'video') {
                            console.log("Video, es ist gut! " + sourceInfo);
                            constraints['video']['optional'][0]['sourceId'] = sourceInfo.id;
                        } else {
                            console.log('Some other kind of source: ', sourceInfo);
                        }
                    }
                    // Call the getUserMedia method with our callback functions
                    if (navigator.getUserMedia) {
                        navigator.getUserMedia(constraints, successCallback, errorCallback);
                    } else {
                        scope.ngVideoError({error: 'Native web camera streaming (getUserMedia) not supported in this browser.'});
                    }
                }

                if (typeof MediaStreamTrack === 'undefined'){
                  alert('This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
                } else {
                  MediaStreamTrack.getSources(gotSources);
                }

                qrcode.callback = function(data) {
                    scope.ngSuccess({data: data});
                };
            }
        }
    }]);
