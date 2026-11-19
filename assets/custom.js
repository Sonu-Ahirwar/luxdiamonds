// js for header nav
const drawer = document.querySelector('.menu-drawer__menu');

drawer.querySelectorAll('.menu-drawer__menu-container')
  .forEach((detail) => {

    detail.addEventListener('toggle', function () {

      if (detail.open) {
        drawer
          .querySelectorAll('.menu-drawer__menu-container')
          .forEach((other) => {
            if (other !== detail) other.removeAttribute('open');
          });
      }

    });

  });

// js for home page by style slider
// $('.multiple-items').slick({
//     dots: true,
//     infinite: true,
//     speed: 300,
//     slidesToShow: 5,
//     slidesToScroll: 4,
//     arrows: false,
//     responsive: [
//         {
//         breakpoint: 1025,
//         settings: {
//             rows: 2,
//             slidesPerRow: 2,
//             slidesToShow: 3,
//             slidesToScroll: 1,
//             infinite: false,
//             dots: true
//         }
//         },
//         {
//         breakpoint: 600,
//         settings: {
//             rows: 2,
//             slidesPerRow: 2,
//             slidesToShow: 2,
//             slidesToScroll: 1,
//             infinite: false,
//         }
//         }
//     ]
// });

$('.multiple-items').each(function () {

    var $slider = $(this);
    var $section = $slider.closest('.shop_by_style_slider');
    var $progress = $section.find('.slider-progress__bar');

    $slider.slick({
        dots: false,
        infinite: true,
        speed: 300,
        slidesToShow: 5,
        slidesToScroll: 4,
        arrows: false,

        responsive: [
            {
                breakpoint: 1025,
                settings: {
                    rows: 2,
                    slidesPerRow: 2,
                    slidesToShow: 3,
                    slidesToScroll: 1,
                    infinite: false,
                    dots: false
                }
            },
            {
                breakpoint: 600,
                settings: {
                    rows: 2,
                    slidesPerRow: 2,
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    infinite: false,
                    dots: false
                }
            }
        ]
    });

    function updateProgress(slick, currentSlide) {

        var current = currentSlide || 0;
        var total = slick.slideCount;

        var slidesToShow = slick.options.slidesToShow;
        var slidesToScroll = slick.options.slidesToScroll;

        var maxSlide = Math.max(1, total - slidesToShow);

        var progress = total <= slidesToShow
            ? 100
            : (current / maxSlide) * 100;

        $progress.css('width', progress + '%');
    }

    $slider.on('init reInit afterChange', function (event, slick, currentSlide) {
        updateProgress(slick, currentSlide);
    });

    updateProgress($slider.slick('getSlick'), 0);

});


// js for home inspired section slider
$('.new-home-inspired-slider').slick({
  centerMode: true,
  centerPadding: '200px',
  slidesToShow: 3,
//   autoplay: true,
  autoplaySpeed: 2000,
  infinite: true,
  dots: true,
  arrows: false,
  responsive: [
    {
      breakpoint: 1199,
      settings: {
        arrows: false,
        centerMode: true,
        centerPadding: '120px',
        slidesToShow: 3
      }
    },
    {
      breakpoint: 991,
      settings: {
        arrows: false,
        centerMode: true,
        centerPadding: '200px',
        slidesToShow: 1
      }
    },
    {
      breakpoint: 767,
      settings: {
        arrows: false,
        centerMode: true,
        centerPadding: '120px',
        slidesToShow: 1
      }
    },
    {
      breakpoint: 480,
      settings: {
        arrows: false,
        centerMode: true,
        centerPadding: '80px',
        slidesToShow: 1
      }
    }
  ]
});