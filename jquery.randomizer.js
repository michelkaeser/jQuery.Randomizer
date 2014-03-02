// The MIT License (MIT)
//
// Copyright (c) 2014 Michel Käser <mk@frontender.ch>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
(function ($, window, document, undefined)
{
    var pluginName = 'randomizer';

    function Plugin (element, options)
    {
        this.el      = element;
        this.$el     = $(element);
        this.options = $.extend({}, $.fn[pluginName].defaults, options);
        this.init();
    }

    Plugin.prototype =
    {
        init: function ()
        {
            this.current       = null;
            this.recursionDeep = 0;

            var $this = this;

            $(window).bind('resizeEnd', function()
            {
                $this._onResize();
                $this._position();
            });

            $(window).resize(function ()
            {
                if (this.resizeTO) clearTimeout(this.resizeTO);
                this.resizeTO = setTimeout(function () {
                    $(this).trigger('resizeEnd');
                }, $this.options.delay);
            });

            $this._position();
        },

        destroy: function ()
        {
            this.$el.removeData();
            $(window).unbind('resizeEnd');

            var $this = this;
            $.each($this.options.randoms, function (index, value) {
                $(value).css({
                    position: '',
                    top:      '',
                    left:     ''
                });
            });
        },

        _getCoordinates: function (width, height)
        {
            var $this = this;

            var area = {
                w: this.$el.width(),
                h: this.$el.height()
            };
            var origin = {
                x: Math.floor( Math.random() * area.w ),
                y: Math.floor( Math.random() * area.h )
            };
            if (origin.x + width >= area.w) origin.x -= width;
            if (origin.y + height >= area.h) origin.y -= height;

            if ($this.recursionDeep < $this.options.tries && !$this._isIsolated({
                p1: origin,
                p2: {
                    x: origin.x + width,
                    y: origin.y + height
                }
            })) {
                ++$this.recursionDeep;
                origin = this._getCoordinates(width, height);
            }

            if ($this.recursionDeep !== 0) {
                --$this.recursionDeep;
            }

            return origin;
        },

        _isIsolated: function (rectangle)
        {
            var isolated = true;
            var others   = this.options.collisions;
            var $this    = this;
            $.each(others, function (index, value) {
                if ($this.current != value) {
                    var other     = $(value);
                    var offset    = other.offset();
                    var container = {
                        p1: {
                            x: offset.left,
                            y: offset.top
                        },
                        p2: {
                            x: offset.left + other.outerWidth(),
                            y: offset.top + other.outerHeight()
                        }
                    };

                    if (rectangle.p1.x < (container.p2.x + $this.options.spacing) && rectangle.p2.x > (container.p1.x - $this.options.spacing) && rectangle.p1.y < (container.p2.y + $this.options.spacing) && rectangle.p2.y > (container.p1.y - $this.options.spacing)) {
                        isolated = false;
                        return false; // break each loop
                    }
                }
            });

            return isolated;
        },

        _onError: function (current)
        {
            $(current).css({
                position: 'absolute',
                top:      '-9999px',
                left:     '-9999px'
            });
            this.options.onError(current);
        },

        _onResize: function ()
        {
            $.each(this.options.randoms, function (index, value) {
                var self = $(value);
                self.css({
                    top:  '-9999px',
                    left: '-9999px'
                });
            });
            this.options.onResize();
        },

        _onSuccess: function (current)
        {
            this.options.onSuccess(current);
        },

        _position: function ()
        {
            var $this = this;
            $.each($this.options.randoms, function (index, value)
            {
                var random    = $(value);
                var width     = random.outerWidth();
                var height    = random.outerHeight();

                $this.current = value;
                random.addClass('js-gets-positioned');
                var origin    = $this._getCoordinates(width, height);

                if ($this._isIsolated({
                    p1: origin,
                    p2: {
                        x: origin.x + width,
                        y: origin.y + height
                    }
                })) {
                    random.css({
                        position: 'absolute',
                        left:     origin.x,
                        top:      origin.y
                    });
                    $this._onSuccess(random);
                } else {
                    $this._onError(random);
                }

                random.removeClass('js-gets-positioned');
                $this.current = null;
            });
        }
    };

    $.fn[pluginName] = function (options)
    {
        var args = arguments;
        if (options === undefined || typeof options === 'object') {
            return this.each(function() {
                if (!$.data(this, 'plugin_' + pluginName)) {
                    $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
                }
            });
        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            if (Array.prototype.slice.call(args, 1).length === 0 && $.inArray(options, $.fn[pluginName].getters) !== -1) {
                var instance = $.data(this[0], 'plugin_' + pluginName);
                return instance[options].apply(instance, Array.prototype.slice.call(args, 1));
            } else {
                return this.each(function() {
                    var instance = $.data(this, 'plugin_' + pluginName);
                    if (instance instanceof Plugin && typeof instance[options] === 'function') {
                        instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                    }
                });
            }
        }
    };

    $.fn[pluginName].defaults = {
        randoms:    [],           // the objects to align randomly
        collisions: [],           // objects which should not be overlaped
        spacing:    75,           // additional spacing required around collisions
        tries:      25,           // the maximum number of tries to find a non collision origin
        delay:      500,          // the resize end delay
        onError:    function (current)
        {
            //
        },
        onResize:  function ()
        {
            //
        },
        onSuccess: function (current)
        {
            //
        }
    };
})(jQuery, window, document);
