H5PEditor.CoursePresentation.SlideSelector = (function ($, EventDispatcher) {

  /**
   * Create a Slide Selector with background settings
   *
   * @class H5PEditor.CoursePresentation.SlideSelector
   * @extends H5P.EventDispatcher Enables pub/sub
   * @param {H5PEditor.CoursePresentation} cpEditor CP editor for listening to events
   * @param {jQuery} $slides Targeted slides
   * @param {Object} globalFields Global semantic fields
   * @param {Object} slideFields Single slide semantic fields
   * @param {Object} params Parameters for semantic fields
   */
  function SlideSelector(cpEditor, $slides, globalFields, slideFields, params) {
    var self = this;

    // Inheritance
    EventDispatcher.call(self);

    // Background selector open state
    var isOpen = false;

    // Keep track of single slides
    var singleSlides = [];

    // Keep track of the global background selector
    var globalBackground;

    // Keep track of current slide
    var currentSlide = 0;

    // DOM elements
    var $popup = $('<div class="h5p-background-selector">');
    $('<div>', {
      'class': 'h5p-background-selector-title',
      html: H5PEditor.t('H5PEditor.CoursePresentation', 'slideBackground', {}),
      appendTo: $popup
    });
    var $header = $('<div>').appendTo($popup);
    var $contentWrapper = $('<div class="h5p-background-selector-content-wrapper">').appendTo($popup);
    var $globalContent;
    var $slideContent;

    // Single slide semantic fields
    var singleSlideFields = H5PEditor.CoursePresentation.findField('slideBackgroundSelector', slideFields.field.fields);

    /**
     * Init background selectors
     */
    var initBgSelectors = function () {

      // Global bg selector
      $globalContent = createSlideSelector('All slides', true);
      globalBackground = new H5PEditor.CoursePresentation.BackgroundSelector($slides.children())
        .addBgSelector(globalFields, params, $globalContent, {isVisible: true});

      // Single slide bg selector
      $slideContent = createSlideSelector('Current slide', false);
      $slides.children().each(function (idx) {
        initSingleSlide($slideContent, idx);
      });

      // Select single slide if first slide has single slide options
      if (singleSlides[0].getSettings()) {
        changeSlideType($slideContent)
      }

      // Resize header items
      $header.children().css('width', (100 / $header.children().length) + '%');
    };

    /**
     * Init listeners for slide operations
     */
    var initSlideOperationsListeners = function () {
      // Register changed slide listener
      cpEditor.cp.on('changedSlide', function (e) {
        if (currentSlide !== e.data) {
          changeToSlide(e.data);
        }
      });

      cpEditor.on('sortSlide', function (e) {
        sortSlide(e.data);
      });

      cpEditor.on('removeSlide', function (e) {
        removeSlide(e.data);
      });
      cpEditor.on('addedSlide', function (e) {
        addSlide(e.data);
      });
    };

    /**
     * Sanitize parameters of slide index, so they can be easily processed
     *
     * @param {number} idx Index of slide parameters
     */
    var sanitizeSlideParams = function (idx) {
      var slideParams =  params.slides[idx].slideBackgroundSelector;
      if (!slideParams) {
        return;
      }

      if (slideParams.fillSlideBackground && !slideParams.fillSlideBackground.length) {
        slideParams.fillSlideBackground = undefined;
      }

      if (slideParams.imageSlideBackground && !slideParams.imageSlideBackground.path) {
        slideParams.imageSlideBackground = undefined;
      }
    };

    /**
     * Add slide selector at specified index
     *
     * @param {number} newSlideIndex Index for new slide
     */
    var addSlide = function (newSlideIndex) {
      // Must sanitize params before processing semantics
      sanitizeSlideParams(newSlideIndex);
      initSingleSlide($slideContent, newSlideIndex);

      // Change to selected radio button
      var selectedIndex = singleSlides[newSlideIndex - 1].getSelectedIndex();
      singleSlides[newSlideIndex].setSelectedIndex(selectedIndex);
    };

    /**
     * Remove slide selector at specified index
     *
     * @param {number} removeIndex Index of removed slide
     */
    var removeSlide = function (removeIndex) {
      var removed = singleSlides.splice(removeIndex, 1);
      removed.forEach(function (singleSlide) {
        singleSlide.removeElement();
      });
    };

    /**
     * Sort current slide selector to the specified direction
     *
     * @param {number} dir Negative or positive direction and value of sort.
     */
    var sortSlide = function (dir) {
      // Validate sort
      if ((currentSlide + dir >= 0) && (currentSlide + dir < $slides.children().length)) {

        // Sort single slide settings in direction
        var temp = singleSlides[currentSlide + dir];
        singleSlides[currentSlide + dir] = singleSlides[currentSlide];
        singleSlides[currentSlide] = temp;

        // Swap elements
        var prev = currentSlide + (dir < 0 ? 0 : dir);
        var next = currentSlide + (dir < 0 ? dir : 0);
        $slideContent.children().eq(prev)
          .insertBefore($slideContent.children().eq(next));
      }
    };

    /**
     * Initialize a single slide
     *
     * @param {jQuery} $wrapper Element the single slide will be attached to
     * @param {number} idx Index single slide will be inserted at
     * @returns {H5PEditor.CoursePresentation.BackgroundSelector} Background selector that was created
     */
    var initSingleSlide = function ($wrapper, idx) {
      var slideParams = params.slides[idx];

      var singleSlide = new H5PEditor.CoursePresentation.BackgroundSelector($slides.children().eq(idx), true);

      // Trigger fallback to global background when single slide is removed
      globalBackground.setBackgroundSlides($slides.children());
      singleSlide.on('turnedGlobal', function () {
        globalBackground.addBackground();
      });

      // Create background selector
      singleSlide.addBgSelector(singleSlideFields, slideParams, $wrapper, {
        isSingle: true,
        isVisible: (idx === 0),
        index: idx
      });

      singleSlides.splice(idx, 0, singleSlide);
      return singleSlide;
    };

    /**
     * Change to specified slide
     *
     * @param {number} index Index of slide we will change to
     */
    var changeToSlide = function (index) {
      // Slide has not been created yet
      if (index >= singleSlides.length) {
        return;
      }

      // Show new slide if we changed slide
      $slideContent.children().removeClass('show');
      $slideContent.children().eq(index).addClass('show');

      // Show slide specific options
      var $changeToSlide = singleSlides[index].getSettings() ? $slideContent : $globalContent;
      changeSlideType($changeToSlide);

      // Show new slide bg selector
      currentSlide = index;
      updateColorPicker();
    };

    /**
     * Change slide type
     *
     * @param {jQuery} $content The element that we will show
     */
    var changeSlideType = function ($content) {
      var $headerButton = $header.children().eq($content.index());
      if ($content.hasClass('show') && $headerButton.hasClass('active')) {
        return;
      }

      // Show new content
      $contentWrapper.children().removeClass('show');
      $content.addClass('show');

      // Set button as active
      $header.children().removeClass('active').attr('aria-pressed', false);
      $headerButton.addClass('active').attr('aria-pressed', true);

      updateColorPicker();
    };

    /**
     * Create slide selector
     *
     * @param {string} option Label of slide selector
     * @param {boolean} isVisible Initial visibility of slide selector
     * @returns {jQuery} Slide selector that was created
     */
    var createSlideSelector = function (option, isVisible) {
      // First slide selector will be active
      var first = isVisible ? ' show' : '';
      var active = isVisible ? ' active' : '';

      // Content element
      var $content = $('<div>', {
        class: 'h5p-slide-selector-content' + first
      }).appendTo($contentWrapper);

      // Option for showing content
      var $slideSelectorOption = $('<div>', {
        'class': 'h5p-slide-selector-option' + active,
        html: option,
        role: 'button',
        tabIndex: 0,
        on: {
          click: function () {
            changeSlideType($content);
          },
          keypress: function (event) {
            if (event.which === 32) { // Space
              changeSlideType($content);
              return false;
            }

          }
        },
        appendTo: $header
      });

      if (isVisible) {
        $slideSelectorOption.attr('aria-pressed', true);
      }

      return $content;
    };

    /**
     * Update color picker in current slide
     */
    var updateColorPicker = function () {
      isSingleSlide() ? singleSlides[currentSlide].updateColorPicker() : globalBackground.updateColorPicker();
    };

    /**
     * Determine if selected slide is a single slide
     *
     * @returns {boolean} True if currently selected slide is a single slide
     */
    var isSingleSlide = function () {
      return $slideContent.hasClass('show');
    };

    /**
     * Append slide selector to wrapper
     *
     * @param {jQuery} $wrapper Wrapper we attach to
     * @returns {H5PEditor.CoursePresentation.SlideSelector}
     */
    self.appendTo = function ($wrapper) {
      self.$wrapper = $wrapper;
      initBgSelectors();
      initSlideOperationsListeners();
      $popup.appendTo($wrapper);

      return self;
    };

    /**
     * Open popup
     * @returns {H5PEditor.CoursePresentation.SlideSelector}
     */
    self.open = function () {
      if (self.$wrapper) {
        self.$wrapper.removeClass('hidden');
        isOpen = true;
      }

      return self;
    };

    /**
     * Close popup
     * @returns {H5PEditor.CoursePresentation.SlideSelector}
     */
    self.close = function () {
      if (self.$wrapper) {
        self.$wrapper.addClass('hidden');
        isOpen = false;
      }

      return self;
    };

    /**
     * Toggle popup state
     * @returns {H5PEditor.CoursePresentation.SlideSelector}
     */
    self.toggleOpen = function () {
      if (self.$wrapper) {
        if (isOpen) {
          self.close();
        } else {
          self.open();
        }

        updateColorPicker();
      }

      return self;
    };

    /**
     * Communicate when we are ready
     *
     * @returns {boolean} True if ready
     */
    self.ready = function () {
      return true; // Always ready
    };

    /**
     * Checks validity of user input
     *
     * @returns {boolean} True if valid
     */
    self.validate = function () {
      var valid = true;
      valid &= globalBackground.validate();

      singleSlides.forEach(function (singleSlide) {
        valid &= singleSlide.validate();
      });

      return valid;
    };
  }

  // Inheritance
  SlideSelector.prototype = Object.create(EventDispatcher.prototype);
  SlideSelector.prototype.constructor = SlideSelector;

  return SlideSelector;
})(H5P.jQuery, H5P.EventDispatcher);
