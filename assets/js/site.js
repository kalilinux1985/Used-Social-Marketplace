(function () {
    var key = 'pageHistory';
    var current = window.location.href;
    var stack;
    try {
        stack = JSON.parse(sessionStorage.getItem(key)) || [];
    } catch (e) {
        stack = [];
    }

    var existingIdx = stack.lastIndexOf(current);
    if (existingIdx !== -1) {
        stack = stack.slice(0, existingIdx);
    }

    var last = stack[stack.length - 1];
    var secondLast = stack[stack.length - 2];
    var target = null;
    if (last && last !== current) {
        target = last;
    } else if (secondLast && secondLast !== current) {
        target = secondLast;
    }

    if (target) {
        var btns = document.querySelectorAll('.js-back-button');
        for (var i = 0; i < btns.length; i++) {
            btns[i].setAttribute('href', target);
            btns[i].classList.remove('d-none');
        }
    }

    stack.push(current);
    if (stack.length > 10) stack.shift();
    try {
        sessionStorage.setItem(key, JSON.stringify(stack));
    } catch (e) {}
})();

// In-place messaging pages (messages/inPlaceMessagingAssets.blade.php) can come back from history without
// asking the server: from the back/forward cache, or (no-cache, not no-store) as cached HTML on Back/Forward.
// Then, and when the heartbeat finds the user had dropped "offline" (no new.message broadcasts reach offline
// users), the page fires `atw:messages-stale` so the inbox and thread fetch what they missed. The same call
// checks that the session that rendered the page is still the one logged in; if not, a reload goes to login.
(function () {
    var HEARTBEAT_MS = 20 * 60 * 1000;
    var lastCheck = 0;
    var firstPageShow = true;

    function meta() {
        return document.querySelector('meta[name="session-status-url"]');
    }

    function markStale() {
        document.dispatchEvent(new CustomEvent('atw:messages-stale'));
    }

    function checkSession(forceStale) {
        var element = meta();
        if (!element) {
            return;
        }

        lastCheck = Date.now();

        if (forceStale) {
            markStale();
        }

        fetch(element.getAttribute('content'), {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (String(data.user_id) !== element.getAttribute('data-user-id')) {
                    window.location.reload();
                } else if (data.was_offline && !forceStale) {
                    markStale();
                }
            })
            .catch(function () {});
    }

    function isHistoryLoad() {
        var navigation = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;

        return !!navigation && navigation.type === 'back_forward';
    }

    window.addEventListener('pageshow', function (event) {
        // persisted: back/forward cache. First pageshow of a back_forward load: maybe cached HTML.
        var historyLoad = firstPageShow && isHistoryLoad();
        firstPageShow = false;

        if (event.persisted || historyLoad) {
            checkSession(true);
        }
    });

    // Heartbeat while the page is in view; after a long hidden spell, check straight away
    setInterval(function () {
        if (!document.hidden && Date.now() - lastCheck >= HEARTBEAT_MS) {
            checkSession(false);
        }
    }, 60 * 1000);

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && lastCheck && Date.now() - lastCheck >= HEARTBEAT_MS) {
            checkSession(false);
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (lastCheck === 0) {
            lastCheck = Date.now();
        }
    });
})();

function calendarDateClicked(date) {
    var locale = $('html').attr('lang');
    var urlPrefix = locale === 'en' ? '' : '/' + locale;
    $.get(urlPrefix + '/calendar/' + date + '/events', function (data) {
        $('.calendar-date-info').html(data);
    });

    $('html, body').animate({
        scrollTop: $('.calendar-date-info').offset().top - 200
    }, 500);
}

$( document ).ready(function() {
    // setTimeout(function(){
    //     $('.message-alert').prepend('<span class="text-danger h2" style="position: absolute; top: -20px; left: 24px">&#8226;</span>')
    //     }, 3000
    // );

    // Remove any loading spinners when page loads (handles back button case)
    $('.click-loading').find('.fa-spinner-third').remove();

    // Also handle when page becomes visible again (back/forward navigation)
    $(window).on('pageshow', function(event) {
        if (event.originalEvent.persisted) {
            // Page was loaded from cache
            $('.click-loading').find('.fa-spinner-third').remove();
        }
    });

    $('.click-loading').click(function() {
        $(this).append('<i class="ml-1 fas fa-spinner-third fa-spin"></i>');
    });

    $('.instant-video').bind('contextmenu',function() { return false; });

    // Delegated: the note modal also arrives with a thread opened in place (message-inbox.js)
    $(document).on('change', '.note-type-select', function() {
        if(this.value == 2) {
            $('.note-date-options').removeClass('hide')
        } else {
            $('.note-date-options').addClass('hide')
        }
    });

    $(document).on('click', '.show-notes', function() {
        $('.notes-div').slideToggle();

        if($('.notes-container').find('.awaiting-notes').length) {
            var locale = $('html').attr('lang');
            var urlPrefix = locale === 'en' ? '' : '/' + locale;
            $.get(urlPrefix + '/notes/user/' + $(this).data('noted-user-id'), function (data) {
                $('.notes-container').html(data);
            });
        }
    });

    $("select#discovered").change(function(){
        var discovered = $(this).children("option:selected").val();
        if(discovered == "Other") {
            $('#discovered-area').html('<input type="text" placeholder="Please specify here" class="form-control" name="discovered"/>')
        }
    });
    // $('#discovered').click(function() {
    //     $('.notes-div').slideToggle();
    //
    //     if($('.notes-container').find('.awaiting-notes').length) {
    //         $.get('/notes/user/' + $(this).data('noted-user-id'), function (data) {
    //             $('.notes-container').html(data);
    //         });
    //     }
    // });

    $('.show-image-upload').click(function() {
        $('#addPhotoModal').modal('show');
    });

    $(document).on('click', '.refresh-button', function() {
        $(this).addClass('fa-spin brand');
        location.reload();
    });


    $('.show-calculator').click(function() {
        $('.calculator-form').slideToggle();
    });

    $('.show-add-status').click(function() {
        $('#addPostModal').modal('show');
    });

    $('.show-add-poll').click(function() {
        $('#addPollModal').modal('show');
    });

    $('.show-hashtags-div').click(function() {
        $('.hashtags-div').slideToggle();
        $('.search-div').slideUp();
    });

    $('.show-search-div').click(function() {
        $('.search-div').slideToggle();
        $('.hashtags-div').slideUp();
        $('.search-div input[name="q"]').focus();
    });

    // ATW mobile bottom nav: pop-ups (Search / Account / Shop) are mutually exclusive.
    var atwNavPopups = '#atwSearchPopup, #atwAccountMenu, #atwShopMenu';
    var atwNavToggles = '[data-atw-search-toggle], [data-atw-account-toggle], [data-atw-shop-toggle]';

    function atwCloseNavPopups() {
        $(atwNavPopups).hide();
        $(atwNavToggles).attr('aria-expanded', false);
    }

    function atwToggleNavPopup($toggle, selector, onOpen) {
        var $popup = $(selector);
        var willOpen = !$popup.is(':visible');
        atwCloseNavPopups();
        if (willOpen) {
            $popup.show();
            $toggle.attr('aria-expanded', true);
            if (onOpen) {
                onOpen($popup);
            }
        }
    }

    $('[data-atw-search-toggle]').click(function(e) {
        e.preventDefault();
        atwToggleNavPopup($(this), '#atwSearchPopup', function($popup) {
            $popup.find('input[name="term"]').focus();
        });
    });

    $('[data-atw-account-toggle]').click(function(e) {
        e.preventDefault();
        atwToggleNavPopup($(this), '#atwAccountMenu');
    });

    $('[data-atw-shop-toggle]').click(function(e) {
        e.preventDefault();
        atwToggleNavPopup($(this), '#atwShopMenu');
    });

    // Close the bottom-nav pop-ups when tapping outside them.
    $(document).on('click', function(e) {
        if (!$(e.target).closest(atwNavPopups + ', .atw-bottom-nav').length) {
            atwCloseNavPopups();
        }
    });

    // Gift options of the tip modal (includes/tipModal.blade.php)
    $(document).on('change', '.type-of-transaction', function () {
        var $select = $(this);
        if ($select.val() === 'gift-membership' && $select.data('gift-membership-url')) {
            window.location.href = $select.data('gift-membership-url');
        }
        if ($select.val() === 'gift-diamond' && $select.data('gift-diamond-url')) {
            window.location.href = $select.data('gift-diamond-url');
        }
    });

    // Pay-per-message modal (contracts/payPerMessageModal.blade.php)
    $(document).on('click', '.show-pay-per-message', function (e) {
        e.preventDefault();
        $('#payPerMessageModal').modal('show');
    });

    $(document).on('click', '.show-confirm-div', function() {
        $(this).next('.confirm-div').slideToggle();

        $('html, body').animate({
            scrollTop: $(this).offset().top - 200
        }, 500);
    });

    $('.show-message-image-form').click(function() {
        $('.message-image-form').toggle();
    });

    $(document).on('click', '.reply-comment', function() {
        $(this).closest('.activity-comments').find('textarea[name="comment"]').focus();

        var commentInput = $(this).closest('.activity-comments').find('textarea[name="comment"]')

        if(commentInput.val().length > 0) {
            commentInput.val(commentInput.val() + ' @' + $(this).data('username') + ' ');
        } else {
            commentInput.val('@' + $(this).data('username') + ' ');
        }

        $('html, body').animate({
            scrollTop: commentInput.offset().top - 100
        }, 100);
    });

    $('.show-likes').click(function() {
        $(this).siblings('a').removeClass('hide');
        $(this).remove();
    });

    $('.show-listing-image-form').click(function() {
        $('.listing-image-form').toggle();
    });

    $(document).on('click', '.show-add-image-input', function() {
        $('.add-image-input').toggle();
    });

    $('.show-activity-comments').click(function() {
        $(this).parent().parent().find('.activity-comments').toggle();
    });

    $('.add-post-description').keyup(delay(function(e) {
        if($(this).val().includes('drain') || $(this).val().includes('findom') || $(this).val().includes('paypig') || $(this).val().includes('wallet') || $(this).val().includes('wheel')) {
            // Only send request if the popup is not already visible
            if(!$('.activity-drain-popup').is(':visible')) {
                var element = this;
                var lang = $('.activity-drain-popup').data('language');
                var url = '/findoms-widget/';
                if(lang != 'en') {
                    url = '/' + lang + '/findoms-widget/';
                }
                $.get(url, function (data) {
                    $('.activity-drain-popup').html(data)
                    $('.activity-drain-popup').slideDown();
                });
            }
        } else {
            $('.activity-drain-popup').slideUp();
        }
    }));

    $('.filter-expand').click(function() {
        $('.filter-section').toggle();
    });

    $('.filter-option-expand').click(function() {
        $(this).siblings('.filter-options').slideToggle();
    });

    $('.expanding-text').each(function(index) {
        if ($(this).height() > 160) {
            $(this)
                .css({
                    'height': '160px',
                    'position': 'relative',
                    'overflow': 'hidden'
                })
                .addClass('expanding-text-shadow')
                .after('<button class="text-center expanding-text-click btn-outline-primary btn btn-sm">' + seeMoreButtonText + '</button>');
        }
    });

    $(document).on('click', '.expanding-text-click', function() {
        $(this)
            .prev('.expanding-text')
            .css({
                'height': 'auto',
                'position': 'initial',
            })
            .removeClass('expanding-text-shadow');
        $(this).remove();
    });

    $('.scroll-to-message').click(function() {
        $('html, body').animate({
            scrollTop: $('.add-message-form').offset().top - 150
        }, 100);
    });

    $('.scroll-to-starter-checklist').click(function() {
        $('html, body').animate({
            scrollTop: $('.starter-checklist').offset().top - 100
        }, 100);
    });

    $('.imageUpload').change(function(event) {
        $('#imagePreview').attr('src', URL.createObjectURL(event.target.files[0]))
    });

    $('.comment-activity-form').submit(function(event) {
        event.preventDefault();

        var comment = $(this).find('textarea[name="comment"]').val();
        var activityId = $(this).find('input[name="activity_id"]').val();

        if(comment.length < 5) {
            $('.text-danger', this).removeClass('hide');
            return;
        }

        $('.text-danger', this).addClass('hide');

        $('button', this).attr('disabled', 'disabled');

        var element = this;

        $.get('/activities/' + activityId + '/comment?comment=' + encodeURIComponent(comment), function (data) {
            $('button', element).removeAttr('disabled').html('<i class="fas fa-paper-plane"></i>');
            $(element).find('textarea[name="comment"]').val('');
            $(element).parents('.activity-item').find('.comments-list').html(data);
            $(element).parents('.activity-item').find('.comments-count').text(parseInt( $(element).parents('.activity-item').find('.comments-count').text()) + 1);
        }).fail(function(data) {
            if(data.responseText.length > 1000) {
                $('.text-danger', element).text('There has been an issue adding your comment. Please try again later.');
            } else {
                $('.text-danger', element).text(data.responseText);
            }
            $('.text-danger', element).removeClass('hide');
            $('button', element).removeAttr('disabled').html('<i class="fas fa-paper-plane"></i>');
        });
    });

    $('.comments-list').on('click', '.delete-comment', function() {
        var activityId = $(this).data('activity-id');
        var key = $(this).data('key');
        var element = this;
        $.get('/activities/' + activityId + '/comment/' + key + '/delete', function (data) {
            $(element).parents('.activity-item').find('.comments-count').text(parseInt($(element).parents('.activity-item').find('.comments-count').text()) - 1);
            $(element).parents('.activity-item').find('.comments-list').html(data);
        }).fail(function(xhr) {
            if (xhr.responseText && xhr.responseText.length < 1000) {
                alert(xhr.responseText);
            }
        });
    });

    $('.comments-list').on('click', '.like-comment', function() {
        var activityId = $(this).data('activity-id');
        var commentKey = $(this).data('comment-key');
        var element = this;
        var locale = $('html').attr('lang');
        var urlPrefix = locale === 'en' ? '' : '/' + locale;

        // Get CSRF token from existing form or meta tag
        var csrfToken = $('input[name="_token"]').val() || $('meta[name="csrf-token"]').attr('content');

        $.post(urlPrefix + '/activities/' + activityId + '/comment/' + commentKey + '/like', {
            _token: csrfToken
        }, function (data) {
            if (data.success) {
                var heartIcon = $(element).find('i');
                var countSpan = $(element).find('.comment-likes-count');
                var commentRow = $(element).closest('.row');

                if (data.hasLiked) {
                    heartIcon.addClass('text-danger fas');
                } else {
                    heartIcon.removeClass('text-danger fas');
                    heartIcon.addClass('far');
                }

                countSpan.text(data.likesCount);

                // Update or create the likes images section
                var likesImagesDiv = commentRow.find('.comment-likes-images');

                if (data.likesCount > 0) {
                    var imagesHtml = '';
                    var maxImages = Math.min(data.likesData.length, 5);

                    for (var i = 0; i < maxImages; i++) {
                        var like = data.likesData[i];
                        var profileRoute = urlPrefix + '/user/' + like.slug;
                        var imageName = like.image || 'user.png';
                        var imageUrl = '/img/users/' + imageName;

                        imagesHtml += '<a href="' + profileRoute + '" title="' + like.username + '">';
                        imagesHtml += '<img class="rounded-circle border mr-1" src="https://www.allthingsassets.com' + imageUrl + '" alt="' + like.username + '" style="width: 20px; height: 20px; object-fit: cover;">';
                        imagesHtml += '</a>';
                    }

                    if (data.likesCount > 5) {
                        imagesHtml += '<span class="small text-muted">+' + (data.likesCount - 5) + ' more</span>';
                    }
                } else {
                    likesImagesDiv.remove();
                }
            }
        }).fail(function(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.error) {
                alert(xhr.responseJSON.error);
            }
        });
    });

    $('.vote-poll').click(function() {
        var slug = $(this).data('slug');
        var key = $(this).data('key');
        var element = this;
        var locale = $('html').attr('lang');
        var urlPrefix = locale === 'en' ? '' : '/' + locale;

        $(element).parents('.activity-item').find('.vote-poll').attr('disabled', 'disabled');
        $.get(urlPrefix + '/polls/' + slug + '/vote/' + key, function (data) {
            $(element).parents('.activity-item').find('.poll-area').html(data);
        }).fail(function (xhr) {
            if (xhr.status === 404) {
                $(element).parents('.activity-item').find('.poll-area').html(xhr.responseText);
            }
        });
    });

    $('#category_id').change(function () {
        $('.average-prices').addClass('hide');
        $('.average-prices-' + $(this).val()).removeClass('hide');
    });

    $('#gender-id').change(function () {
        if(this.value == 'M') {
            $('.gender-id-message').removeClass('hide');
        } else {
            $('.gender-id-message').addClass('hide');
        }

    });

    $('.save-for-later-button-area').on('click', '.save-for-later-add', function() {
        var button = $(this);
        button.removeClass('far save-for-later-add');
        button.addClass('fas brand save-for-later-delete');

        $.get('/save-for-later/add/' + button.data('listing-slug'), function () {}).fail(function () {
            button.removeClass('fas brand save-for-later-delete');
            button.addClass('far save-for-later-add');
        });
    });

    $('.save-for-later-button-area').on('click', '.save-for-later-delete', function() {
        $(this).removeClass('fas brand save-for-later-delete');
        $(this).addClass('far save-for-later-add');

        $.get('/save-for-later/delete/' + $(this).data('listing-slug'), function () {});
    });

    $('.like-activity').click(function() {
        if ($(this).data('fdo-buyer-unqualified')) {
            $(this).closest('.activity-item').find('.activity-comments').removeClass('hide');
            return;
        }
        var activityId = $(this).data('activity-id');
        var element = this;
        $.get('/activities/' + activityId + '/like', function () {
            $(element).addClass('hide');
            $(element).parent().find('.unlike-activity').removeClass('hide');
            $(element).parent().find('.likes-count').text(parseInt($(element).parent().find('.likes-count').text()) + 1)
        });
    });

    $('.unlike-activity').click(function() {
        if ($(this).data('fdo-buyer-unqualified')) {
            $(this).closest('.activity-item').find('.activity-comments').removeClass('hide');
            return;
        }
        var activityId = $(this).data('activity-id');
        var element = this;
        $.get('/activities/' + activityId + '/unlike', function () {
            $(element).addClass('hide');
            $(element).parent().find('.like-activity').removeClass('hide');
            $(element).parent().find('.likes-count').text(parseInt($(element).parent().find('.likes-count').text()) - 1)
        });
    });

    $('.recommend-user').click(function() {
        var userId = $(this).data('user-id');
        var element = this;
        $.get('/user/' + userId + '/recommend/', function () {
            $(element).addClass('hide');
            $(element).parent().find('.un-recommend-user').removeClass('hide');
            $(element).parent().find('.recommend-count').text(parseInt($(element).parent().find('.recommend-count').text()) + 1)
        });
    });

    $('.un-recommend-user').click(function() {
        var userId = $(this).data('user-id');
        var element = this;
        $.get('/user/' + userId + '/recommend/', function () {
            $(element).addClass('hide');
            $(element).parent().find('.recommend-user').removeClass('hide');
            $(element).parent().find('.recommend-count').text(parseInt($(element).parent().find('.recommend-count').text()) - 1)
        });
    });

    $(document).on('submit', '.form-disable-double-click', function(){
        $('button', this)
            .html($('button', this).text() + ' <i class="ml-1 fas fa-spinner-third fa-spin"></i>')
            .attr('disabled', 'disabled');
        return true;
    });

    $('.match-user-area').on('click', '.next-match', function() {
        element = $(this);

        element.parents('.match-buttons').find('button').attr('disabled', 'disabled');

        var locale = $('html').attr('lang');
        var urlPrefix = locale === 'en' ? '' : '/' + locale;

        $.get(urlPrefix + '/matchUser?type=' + element.data('type') + '&id=' +  element.data('user-id') , function (data) {
            element.parents('.match-user-area').find('.col-12').fadeOut(function() {
                element.parents('.match-user-area').find('.col-12').fadeIn();
                element.parents('.match-user-area').find('.col-12').html(data);
            });

        });
    });

    $('.side-navigation-button').click(function () {
        if($('.side-navigation').css('width') == '0px') {
            $('.side-navigation').css('width', '250px');
            $('.side-navigation-background').fadeIn();
        } else {
            $('.side-navigation').css('width', '0px');
            $('.side-navigation-background').fadeOut()
        }
    });

    $('[data-toggle="tooltip"]').tooltip();

    $('a.image-gallery').fancybox();

    $('.multiple-select').select2();


    $('.welcome-video-model').on('shown.bs.modal', function (e) {
        $('#video').attr('src', 'https://www.allthingsassets.com/img/videos/all-things-worn.mp4');
    });


    $('.welcome-video-model').on('hide.bs.modal', function (e) {
        $('#video').attr('src', '');
    })

    $('#accept-cookies').click(function(event) {
        event.preventDefault();

        $('#cookieBanner').hide();

        $.ajax({
            url: '/register-cookie-consent',
            type: 'POST',
            success: function(response) {
                // Set cookie client-side only after successful server response
                setCookie('accept_cookie_policy_client_side', new Date().toISOString(), 365 * 2);
            },
            error: function() {
                console.log('Failed to save cookie preferences. Please try again.');
            }
        });
    });

    // Helper function to set cookies
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    // Helper function to get cookies
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    // Check if accept_cookie_policy_client_side cookie exists
    function cookieExists(cookieName) {
        return getCookie(cookieName) !== null;
    }

    // Only show cookie banner if cookie doesn't exist
    if (!cookieExists('accept_cookie_policy_client_side')) {
        $('#cookieBanner').removeClass('hide').show();
    }



    document.addEventListener('input', function (event) {
        if (event.target.classList && event.target.classList.contains('text-area-expand')) {
            autoResize.call(event.target);
        }
    }, false);

    function autoResize() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }

    function delay(callback, ms) {
        var timer = 0;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                callback.apply(context, args);
            }, ms || 0);
        };
    }

    $('.lookup-username').keyup(delay(function(e) {
        $('.lookup-username-content').removeClass('text-danger text-body text-success');

        if ($(this).val().length > 1) {
            $('.lookup-username-content').html('<i class="fas fa-spinner fa-spin"></i>');

            var lang = $('html').attr('lang');

            if(!/^[A-Za-z0-9_]*$/.test($(this).val())) {
                $('.lookup-username-content').html(allowedFormat);
                $('.lookup-username-content').addClass('text-danger');
                return;
            }

            var route = '/lookup/username/';
            if (lang != 'en') {
                route = '/' + lang + route;
            }
            $.get(route + $(this).val(), function (data) {
                $('.lookup-username-content').html(userNameAvailable);
                $('.lookup-username-content').addClass('text-success');
            })
            .fail(function () {
                $('.lookup-username-content').html(userNameAlreadyTaken);
                $('.lookup-username-content').addClass('text-danger');
            })
        }
    }, 700));

    //fix issue with image load
    $(".image-error").on("error", function() {
        $(this).hide();
    });

    // contract comments and likes
    function handleSuccessfulAjaxResponse(response, contractId) {
        $('.contract-item[data-contract-id="' + contractId + '"]').replaceWith(response);
    }

    function handleErrorAjaxResponse(xhr) {
        if(xhr.status === 422) {
            var errors = xhr.responseJSON.errors;
            var errorMessage = '';

            Object.keys(errors).forEach(function() {
                errors.forEach(function(message) {
                    errorMessage += message + "\n";
                });
            });

            alert(errorMessage.trim());
        } else {
            console.log('An error occurred. Please try again.');
        }
    }

    $(document).on('click', '.like-contract, .unlike-contract', function() {
        var contractId = $(this).data('contract-id');
        var action = $(this).hasClass('like-contract') ? 'like' : 'unlike';
        var locale = $('html').attr('lang');
        var urlPrefix = locale === 'en' ? '' : '/' + locale;
        var url = urlPrefix + '/contracts/' + contractId + '/' + action;
        var token = $('meta[name="csrf-token"]').attr('content');

        $.ajax({
            type: "POST",
            url: url,
            headers: {'X-CSRF-TOKEN': token},
            success: function(response) {
                handleSuccessfulAjaxResponse(response, contractId);
            },
            error: function(xhr) {
                handleErrorAjaxResponse(xhr);
            }
        });
    });


    $(document).on('click', '.submit-comment', function() {
        var form = $(this).closest('form');
        var contractId = form.data('contract-id');
        var content = form.find('[name="content"]').val();
        var locale = $('html').attr('lang');
        var urlPrefix = locale === 'en' ? '' : '/' + locale;
        var url = urlPrefix + '/contracts/' + contractId + '/comments'; // Adjust URL as needed
        var token = $('meta[name="csrf-token"]').attr('content');

        $.ajax({
            type: "POST",
            url: url,
            headers: {'X-CSRF-TOKEN': token},
            data: {content: content},
            success: function(response) {
                handleSuccessfulAjaxResponse(response, contractId);
            },
            error: function(xhr) {
                handleErrorAjaxResponse(xhr);
            }
        });
    });

    $(document).on('click', '.delete-contract-comment', function() {
        var commentId = $(this).data('comment-id');
        var contractId = $(this).data('contract-id');
        var csrfToken = $('meta[name="csrf-token"]').attr('content');
        var locale = $('html').attr('lang');
        var urlPrefix = locale === 'en' ? '' : '/' + locale;

        $.ajax({
            url: urlPrefix + '/contracts/comments/' + commentId,
            type: 'DELETE',
            data: {
                _token: csrfToken,
                _method: 'DELETE'
            },
            success: function(response) {
                handleSuccessfulAjaxResponse(response, contractId);
            },
            error: function(xhr) {
                handleErrorAjaxResponse(xhr);
            }
        });
    });

    $(document).on('click', '.reply-contract-comment', function() {
        var contractId = $(this).data('contract-id');
        var commentInput = $('form[data-contract-id="' + contractId + '"]').find('textarea');

        var username = $(this).data('username');

        if (commentInput.val().length > 0) {
            commentInput.val(commentInput.val() + ' @' + username + ' ');
        } else {
            commentInput.val('@' + username + ' ');
        }

        $('html, body').animate({
            scrollTop: commentInput.offset().top - 100
        }, 100, function() {
            commentInput.focus();
        });
    });

    $(document).on('click', '.show-contract-comments', function() {
        var contractId = $(this).data('contract-id');
        $('.comments-list[data-contract-id="' + contractId + '"]').toggle();
    });
});

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll('.copy-link-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var url = this.dataset.url;
            copyToClipboard(url).then(function() {
                btn.innerHTML = '<i class="fas fa-check"></i>';
                var tooltip = btn.querySelector('.copy-tooltip');
                if (!tooltip) {
                    tooltip = document.createElement('span');
                    tooltip.className = 'copy-tooltip';
                    tooltip.textContent = 'Copied!';
                    btn.appendChild(tooltip);
                }
                tooltip.classList.add('show');
                setTimeout(function() {
                    btn.innerHTML = '<i class="fas fa-link"></i>';
                    tooltip.classList.remove('show');
                }, 2000);
            });
        });
    });
});

document.addEventListener('click', function(event) {
    var btn = event.target.closest('.promo-code-copy-btn');
    var field = event.target.closest('.promo-code-copy-field');
    if (!btn && field) {
        btn = field.closest('.input-group').querySelector('.promo-code-copy-btn');
    }
    if (!btn) {
        return;
    }
    var icon = btn.querySelector('i');
    copyToClipboard(btn.dataset.copy).then(function() {
        icon.className = 'fa-regular fa-check';
        setTimeout(function() {
            icon.className = 'fa-regular fa-copy';
        }, 2000);
    });
});

if (('standalone' in window.navigator) && window.navigator.standalone) {
    window.addEventListener('load', function() {
        var links = document.links,
            link,
            i;

        for (i = 0; i < links.length; i++) {
            // Don't do this for javascript: links
            if (~(link = links[i]).href.toLowerCase().indexOf('javascript')) {
                link.addEventListener('click', function(event) {
                    top.location.href = this.href;
                    event.returnValue = false;
                }, false);
            }
        }

    }, false);
}

class DebtContract {
    constructor(config) {
        this.config = config;
        this.debounceTimer;
        this.inputs = ['principle', 'interest_rate', 'debt_length', 'start_date', 'payback_frequency', 'setup_fee'];
        this.form = document.getElementById('createDebtContractForm');
        this.contractData = config.contractData;
        this.init();
    }

    init() {
        if (this.form) {
            // Interactive mode with form
            this.inputs.forEach(input => {
                const element = this.form.querySelector(`#${input}`);
                if (element) {
                    element.addEventListener('input', this.debounceInputChange.bind(this));
                }
            });
            this.checkAndUpdatePaymentDetails();
        } else if (this.contractData) {
            // Display mode with provided contract data
            this.displayContractData();
        }
    }

    debounceInputChange = () => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(this.checkAndUpdatePaymentDetails.bind(this), 500); // 500ms delay
    }

    checkAndUpdatePaymentDetails = () => {
        const principle = parseFloat(this.form.querySelector('#principle').value);
        const interestRate = parseFloat(this.form.querySelector('#interest_rate').value);
        const debtLength = parseInt(this.form.querySelector('#debt_length').value);
        const startDate = this.form.querySelector('#start_date').value;
        const paybackFrequency = parseInt(this.form.querySelector('#payback_frequency').value);
        const setupFee = parseFloat(this.form.querySelector('#setup_fee').value);

        if (principle > 0 && interestRate > 0 && debtLength > 0 && startDate && paybackFrequency && setupFee >= 0) {
            this.updatePaymentDetails(principle, interestRate, debtLength, startDate, paybackFrequency, setupFee);
        } else {
            this.clearPaymentDetails();
        }
    }

    updatePaymentDetails = (principle, interestRate, debtLength, startDate, paybackFrequency, setupFee) => {
        fetch(this.config.calculateDebtPaymentsRoute, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ principle, interest_rate: interestRate, debt_length: debtLength, start_date: startDate, payback_frequency: paybackFrequency, setup_fee: setupFee })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                this.clearPaymentDetails();
                return;
            }

            this.updateUIElements(data);
        })
        .catch(error => {
            console.error('Error:', error);
            this.clearPaymentDetails();
        });
    }

    displayContractData() {
        if (this.contractData) {
            this.updateUIElements(this.contractData);
        }
    }

    updateUIElements = (data) => {
        console.log(data);
        this.setElementText('setupFee', this.formatAmount(data.setupFee));
        this.setElementText('firstPaymentDate', data.firstPaymentDate || '-');
        this.setElementText('nextPaymentDate', data.nextPaymentDate || '-');
        this.setElementText('lastPaymentDate', data.lastPaymentDate || '-');

        // Update payment frequency label
        let paymentFrequencyLabel;
        switch(data.payback_frequency) {
            case 7:
                paymentFrequencyLabel = this.config.translations.weeklyPayment;
                break;
            case 14:
                paymentFrequencyLabel = this.config.translations.biWeeklyPayment;
                break;
            default:
                paymentFrequencyLabel = this.config.translations.monthlyPayment;
        }
        this.setElementText('paymentFrequencyLabel', paymentFrequencyLabel);

        this.setElementText('paymentAmount', this.formatAmount(data.monthlyPayment));
        this.setElementText('totalDebtAmount', this.formatAmount(data.totalDebtAmount));
        this.setElementText('numberOfPayments', data.numberOfPayments || '-');
        this.setElementText('totalPaid', this.formatAmount(data.totalPaid));
        this.setElementText('remaining', this.formatAmount(data.remaining));

        if (data.paymentSchedule) {
            this.updatePaymentSchedule(data.paymentSchedule);
        }
    }

    updatePaymentSchedule(paymentSchedule) {
        const tableBody = document.querySelector('#paymentSchedule tbody');
        console.log(tableBody);
        if (tableBody && Array.isArray(paymentSchedule)) {
            tableBody.innerHTML = '';
            console.log(paymentSchedule);
            paymentSchedule.forEach(payment => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td>${payment.date || '-'}</td>
                    <td>$${this.formatAmount(payment.balance)}</td>
                    <td>$${this.formatAmount(payment.payment)}</td>
                    <td>$${this.formatAmount(payment.remaining)}</td>`;
                if (this.config.showStatusInUi) {
                    const statusClass = this.getStatusClass(payment.status);
                    const translatedStatus = this.getTranslatedStatus(payment.status);
                    row.innerHTML = row.innerHTML +
                        `<td class="${statusClass}">${translatedStatus.charAt(0).toUpperCase() + translatedStatus.slice(1)}</td>`;

                }
            });
        }
    }

    getStatusClass(status) {
        switch(status) {
            case 'paid':
                return 'text-success';
            case 'due':
            case 'partially_paid':
                return 'text-warning';
            case 'overdue':
                return 'text-danger';
            default:
                return '';
        }
    }

    formatAmount(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '-';
        }

        amount = parseFloat(amount);
        const usdAmount = (amount / 10).toFixed(2);
        const kinkCoinsAmount = amount.toFixed(0);
        //return `
        return `${usdAmount}
                <br/>
                <span class="p-1 px-3 rounded-pill bg-brand d-lg-inline text-white mr-2 font-weight-bold font-size-11 d-flex align-items-center">
                    <i class="fas fa-coins"></i> ${kinkCoinsAmount}
                </span>`;
    }

    getTranslatedStatus(status) {
        switch(status) {
            case 'paid':
                return this.config.translations.statusPaid;
            case 'overdue':
                return this.config.translations.statusOverdue;
            case 'partially_paid':
                return this.config.translations.statusPartiallyPaid;
            case 'due':
                return this.config.translations.statusDue;
            case 'upcoming':
                return this.config.translations.statusUpcoming;
            default:
                return status;
        }
    }

    clearPaymentDetails = () => {
        const elements = ['setupFee', 'firstPaymentDate', 'nextPaymentDate', 'lastPaymentDate', 'paymentAmount', 'totalDebtAmount', 'numberOfPayments'];
        elements.forEach(element => {
            this.setElementText(element, '-');
        });
        this.setElementText('paymentFrequencyLabel', this.config.translations.payment);
        const tableBody = document.querySelector('#paymentSchedule tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
        }
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = text;
        }
    }
}

class CurrencyConverter {
    constructor(conversionRate, currencyRates) {
        this.conversionRate = conversionRate;
        this.currencyRates = currencyRates;
    }

    updateConversionWidget(inputId, widgetId, tooltipId) {
        const input = document.getElementById(inputId);
        const widget = document.getElementById(widgetId);
        const tooltip = document.getElementById(tooltipId);

        const updateWidget = () => {
            const kinkCoins = parseFloat(input.value);
            if (!isNaN(kinkCoins) && kinkCoins > 0) {
                const usd = kinkCoins / this.conversionRate;
                widget.innerHTML = `
                    <span class="p-1 px-3 rounded-pill bg-brand d-lg-inline text-white mr-1">
                        <i class="fas fa-coins"></i> ${kinkCoins}
                    </span> = ${usd.toFixed(2)} USD
                `;
                this.updateTooltip(tooltip, usd);
            } else {
                widget.innerHTML = `
                    <span class="p-1 px-3 rounded-pill bg-brand d-lg-inline text-white mr-1">
                        <i class="fas fa-coins"></i> ${this.conversionRate}
                    </span> = 1 USD
                `;
                this.updateTooltip(tooltip, 1);
            }
        };

        input.addEventListener('input', updateWidget);

        updateWidget();
    }

    updateTooltip(tooltip, usdAmount) {
        let tooltipContent = '';
        const currencies = ['GBP', 'EUR', 'CAD', 'AUD', 'JPY'];

        currencies.forEach(currency => {
            if (this.currencyRates[currency]) {
                const amount = usdAmount / this.currencyRates[currency];
                tooltipContent += `${amount.toFixed(2)} ${currency}<br/>`;
            }
        });

        tooltip.setAttribute('data-original-title', tooltipContent);
    }
}

// Self-contained two-way currency <-> KinkCoin field. Each `.js-currency-coin-field` carries its
// own currency selector, a currency amount input and a KinkCoin input, kept in sync live. The coin
// input is what the form submits, so backend/storage is unchanged. Works standalone or several to a
// page; rates come from window.CURRENCY_CONVERSION_RATES / window.COINS_PER_USD (currencyRatesScript).
class CurrencyCoinField {
    constructor(el, rates, coinsPerUsd) {
        this.rates = rates;
        this.coinsPerUsd = coinsPerUsd;
        this.select = el.querySelector('.drain-currency-select');
        this.currencyInput = el.querySelector('.drain-currency-input');
        this.coinInput = el.querySelector('.drain-coin-input');
        this.currency = this.select ? this.select.value : 'USD';
        this.onCurrencyChange = null;

        if (this.currencyInput) {
            this.currencyInput.addEventListener('input', () => this.fromCurrency());
        }

        if (this.coinInput) {
            this.coinInput.addEventListener('input', () => {
                // Skip the reverse-sync when we set the coin value ourselves (from the currency
                // box) — otherwise it would reformat the currency box mid-typing. External
                // listeners still fire, so page calculators (e.g. the debt schedule) stay live.
                if (this._internalCoinUpdate) {
                    return;
                }
                this.fromCoins();
            });
        }

        if (this.select) {
            this.select.addEventListener('change', () => {
                this.currency = this.select.value;
                this.fromCoins();
                if (this.onCurrencyChange) {
                    this.onCurrencyChange(this.currency, this);
                }
            });
        }

        // Pre-fill the currency amount from any coins already present (edit form / validation replay).
        this.fromCoins();
    }

    rate() {
        return this.rates[this.currency] || 1;
    }

    fromCurrency() {
        const amount = parseFloat(this.currencyInput.value);
        if (isNaN(amount) || amount <= 0) {
            this.coinInput.value = '';
        } else {
            this.coinInput.value = Math.round(amount * this.rate() * this.coinsPerUsd);
        }

        this.emitCoin();
    }

    // Fire a native input event on the coin field so page calculators react, without
    // triggering our own reverse-sync (guarded by _internalCoinUpdate).
    emitCoin() {
        if (!this.coinInput) {
            return;
        }
        this._internalCoinUpdate = true;
        this.coinInput.dispatchEvent(new Event('input', { bubbles: true }));
        this._internalCoinUpdate = false;
    }

    fromCoins() {
        if (!this.currencyInput || !this.coinInput) {
            return;
        }

        const coins = parseFloat(this.coinInput.value);
        if (isNaN(coins) || coins <= 0) {
            this.currencyInput.value = '';
            return;
        }

        this.currencyInput.value = (coins / this.coinsPerUsd / this.rate()).toFixed(2);
    }

    setCurrency(currency) {
        if (this.select) {
            this.select.value = currency;
        }
        this.currency = currency;
        this.fromCoins();
    }
}

// Also called for content inserted later (a thread opened in place); each field is set up once
window.initCurrencyCoinFields = function (root) {
    const fields = (root || document).querySelectorAll('.js-currency-coin-field:not([data-currency-coin-ready])');
    if (!fields.length) {
        return;
    }

    fields.forEach((field) => field.setAttribute('data-currency-coin-ready', ''));

    const rates = window.CURRENCY_CONVERSION_RATES || { USD: 1 };
    const coinsPerUsd = window.COINS_PER_USD || 10;

    const instances = Array.from(fields).map((el) => new CurrencyCoinField(el, rates, coinsPerUsd));

    // Keep every field on the same currency (natural for multi-field forms; a no-op for one).
    instances.forEach((instance) => {
        instance.onCurrencyChange = (currency) => {
            instances.forEach((other) => {
                if (other !== instance) {
                    other.setCurrency(currency);
                }
            });
        };
    });
};

document.addEventListener('DOMContentLoaded', function () {
    window.initCurrencyCoinFields(document);
});

document.addEventListener('DOMContentLoaded', function() {
    const countrySelect = document.getElementById('signupFormCountrySelector');

    if (countrySelect) {
        const marketingConsentContainer = document.getElementById('marketing-consent-container');
        const hiddenMarketingOptIn = document.getElementById('hiddenMarketingOptIn');
        const formMarketingOptIn = document.getElementById('formMarketingOptIn');

        countrySelect.addEventListener('change', function() {
            const selectedCountry = this.value;
            if (selectedCountry in countriesRequiringConsent) {
                marketingConsentContainer.style.display = 'block';
                hiddenMarketingOptIn.disabled = true;
                formMarketingOptIn.name = 'marketing_email_notifications';
            } else {
                marketingConsentContainer.style.display = 'none';
                hiddenMarketingOptIn.disabled = false;
                formMarketingOptIn.name = '';
            }
        });

        countrySelect.dispatchEvent(new Event('change'));
    }
});

function initFancybox() {
    $('a.image-single').fancybox();
}
document.addEventListener("DOMContentLoaded", initFancybox);
window.addEventListener('load', initFancybox);

// Helper function to get file type icon
window.getFileTypeIcon = function(mimeType, extension) {
    let iconClass = 'fa-file';
    let colorClass = 'text-primary';

    if (mimeType.startsWith('image/')) {
        iconClass = 'fa-file-image';
        colorClass = 'text-success';
    } else if (mimeType.startsWith('video/')) {
        iconClass = 'fa-file-video';
        colorClass = 'text-danger';
    } else if (mimeType.startsWith('audio/')) {
        iconClass = 'fa-file-audio';
        colorClass = 'text-warning';
    } else if (mimeType === 'application/pdf') {
        iconClass = 'fa-file-pdf';
        colorClass = 'text-danger';
    } else if (['doc', 'docx'].includes(extension)) {
        iconClass = 'fa-file-word';
        colorClass = 'text-primary';
    } else if (['xls', 'xlsx'].includes(extension)) {
        iconClass = 'fa-file-excel';
        colorClass = 'text-success';
    }

    return `<i class="fa-solid ${iconClass} ${colorClass} fa-2x"></i>
            <div class="file-extension small mt-1">.${extension}</div>`;
}

// Shared Resumable Upload Functionality
window.initVideoUpload = function(config) {
    // Function to detect connection type and speed
    function detectConnectionInfo() {
        const connectionInfo = {
            effectiveType: 'unknown',
            downlink: 10,   // Default to 10Mbps if we can't detect
            rtt: 50         // Default to 50ms RTT
        };

        if ('connection' in navigator) {
            // Use the available connection API (may be available via polyfill)
            connectionInfo.effectiveType = navigator.connection.effectiveType || connectionInfo.effectiveType;
            connectionInfo.downlink = navigator.connection.downlink || connectionInfo.downlink;
            connectionInfo.rtt = navigator.connection.rtt || connectionInfo.rtt;
        }

        return connectionInfo;
    }

    function getOptimalUploadSettings() {
        const connection = detectConnectionInfo();

        // Default settings for good connections
        let settings = {
            chunkSize: 10 * 1024 * 1024, // 10MB for good connections
            simultaneousUploads: 3, // Number of simultaneous uploads
            maxChunkRetries: 3,
            testChunks: true, // Test each chunk before uploading
            permanentErrors: [400, 404, 415, 500, 501],
            maxFiles: 1,
            throttleProgressCallbacks: 500 // Limit how often the progress event is fired (ms)
        };

        // Adjust based on connection quality
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.downlink < 0.5) {
            // Very slow connection
            settings.chunkSize = 2 * 1024 * 1024; // 2MB chunks
            settings.simultaneousUploads = 2;
            settings.maxChunkRetries = 5;
        } else if (connection.effectiveType === '3g' || (connection.downlink >= 0.5 && connection.downlink < 2)) {
            // Moderate connection
            settings.chunkSize = 5 * 1024 * 1024; // 5MB chunks
            settings.simultaneousUploads = 2;
            settings.maxChunkRetries = 4;
        } else if (connection.downlink >= 10 && connection.rtt < 30) {
            // Very fast connection
            settings.simultaneousUploads = 4;
        }
        return settings;
    }

    const connectionSettings = getOptimalUploadSettings();

    // Create readable format of allowed extensions
    const allowedExtensionsFormatted = config.allowedExtensions.map(ext => '.' + ext).join(', ');

    // Initialize Resumable.js
    const resumable = new Resumable({
        target: config.targetUrl,
        query: { _token: config.csrfToken },
        testChunks: connectionSettings.testChunks,
        chunkSize: connectionSettings.chunkSize,
        simultaneousUploads: connectionSettings.simultaneousUploads,
        maxChunkRetries: connectionSettings.maxChunkRetries,
        prioritizeFirstAndLastChunk: false,
        forceChunkSize: true,
        throttleProgressCallbacks: connectionSettings.throttleProgressCallbacks,
        permanentErrors: connectionSettings.permanentErrors,
        maxFiles: connectionSettings.maxFiles,
        headers: {
            'X-CSRF-TOKEN': config.csrfToken
        },
        fileParameterName: 'file'
    });

    // Resumable.js isn't supported, fall back to a different method
    if(!resumable.support) {
        document.querySelector(config.feedbackElement).innerHTML = `
            <div class="alert alert-danger d-flex align-items-center" role="alert">
                <i class="ki-duotone ki-shield-cross fs-2hx text-danger me-4"><span class="path1"></span><span class="path2"></span></i>
                <div>
                    Your browser doesn't support resumable uploads. Please update your browser.
                </div>
            </div>
        `;
        return;
    }

    // Make the upload button and drop area clickable
    resumable.assignBrowse(document.querySelector(config.browseElement));
    resumable.assignDrop(document.querySelector(config.dropElement));

    let uploadData = {
        startTime: null,
        lastUpdate: null,
        lastBytes: 0,
        speedDisplay: null
    };

    // Handle when files are added - validates and processes the file
    resumable.on('fileAdded', function(file, event) {
        // Get the file extension
        const extension = file.fileName.split('.').pop().toLowerCase();

        // Max file size in bytes
        const maxFileSize = config.maxFileSize * 1024 * 1024; // Convert MB to bytes

        // Check if the file size is too large
        if (file.size > maxFileSize) {
            // Manually reject this file
            document.querySelector(config.feedbackElement).innerHTML = `
                <div class="alert alert-danger d-flex align-items-center" role="alert">
                    <i class="ki-duotone ki-shield-cross fs-2hx text-danger me-4"><span class="path1"></span><span class="path2"></span></i>
                    <div>
                        The file is too large. Maximum file size is ${config.maxFileSize} MB.
                    </div>
                </div>
            `;

            // Clear any previous previews
            document.querySelector(config.filePreviewElement).classList.add('d-none');

            // Prevent this file from being added and uploaded
            setTimeout(() => resumable.removeFile(file), 0);
            return false;
        }

        // Check if it's an allowed extension
        if (!config.allowedExtensions.includes(extension)) {
            // Manually reject this file
            document.querySelector(config.feedbackElement).innerHTML = `
                <div class="alert alert-danger d-flex align-items-center" role="alert">
                    <i class="ki-duotone ki-shield-cross fs-2hx text-danger me-4"><span class="path1"></span><span class="path2"></span></i>
                    <div>
                        The file type '${extension}' is not allowed. Allowed types: ${allowedExtensionsFormatted}
                    </div>
                </div>
            `;

            // Clear any previous previews
            document.querySelector(config.filePreviewElement).classList.add('d-none');

            // Prevent this file from being added and uploaded
            setTimeout(() => resumable.removeFile(file), 0);
            return false;
        }

        // We only want one file, so cancel any existing uploads first
        if (resumable.files.length > 1) {
            resumable.removeFile(resumable.files[0]);
        }

        // Hide upload zone
        document.querySelector(config.browseElement).style.display = 'none';

        // Call onFileAdded callback if provided
        if (config.onFileAdded) {
            config.onFileAdded(file);
        }

        const filePreview = document.querySelector(config.filePreviewElement);
        filePreview.classList.remove('d-none');

        // Create and add the speed display element
        uploadData = {
            startTime: Date.now(),
            lastUpdate: Date.now(),
            lastBytes: 0,
            speedDisplay: null
        };

        // Handle speed display
        if (config.createSpeedDisplay) {
            uploadData.speedDisplay = config.createSpeedDisplay();
        } else {
            uploadData.speedDisplay = document.querySelector('.upload-speed');
        }

        if (uploadData.speedDisplay) {
            uploadData.speedDisplay.textContent = 'Uploading...';
        }

        // Handle file preview
        if (config.onPreview) {
            // Use custom preview handler if provided
            config.onPreview(file, filePreview);
        } else {
            // Default preview handling
            filePreview.querySelector('.file-name').textContent = truncateFilename(file.fileName);
            const fileExtension = filePreview.querySelector('.file-extension');
            if (fileExtension) {
                fileExtension.textContent = '.' + extension;
            }
        }

        document.querySelector(config.feedbackElement).innerHTML = '';

        // Show progress bar
        filePreview.querySelector('.upload-progress').classList.remove('d-none');

        // Start the upload
        resumable.upload();
        return true;
    });

    // Update progress as chunks are uploaded
    resumable.on('fileProgress', function(file) {
        const progress = Math.floor(file.progress() * 100);
        const filePreviewProgressBar = document.querySelector(config.filePreviewElement + ' .progress-bar');

        // Update progress in file preview
        if (filePreviewProgressBar) {
            filePreviewProgressBar.style.width = progress + '%';
        }

        const now = Date.now();
        const elapsed = (now - uploadData.lastUpdate) / 1000;

        if (elapsed > 0.5 && uploadData.speedDisplay) { // Update twice per second
            const bytesUploaded = file.size * file.progress() - uploadData.lastBytes;
            const speed = bytesUploaded / elapsed;

            // Format speed display based on value
            let speedText = '';
            if (speed < 1024) {
                speedText = speed.toFixed(1) + ' B/s';
            } else if (speed < 1024 * 1024) {
                speedText = (speed / 1024).toFixed(1) + ' KB/s';
            } else {
                speedText = (speed / (1024 * 1024)).toFixed(1) + ' MB/s';
            }

            // Add time remaining estimate for files over 5MB
            if (file.size > 5 * 1024 * 1024) {
                const bytesRemaining = file.size - (file.size * file.progress());
                const timeRemaining = bytesRemaining / speed;

                let timeText;
                if (timeRemaining < 10) {
                    timeText = 'Almost there...';
                } else if (timeRemaining < 60) {
                    timeText = Math.ceil(timeRemaining) + ' seconds remaining';
                } else if (timeRemaining < 3600) {
                    timeText = Math.ceil(timeRemaining / 60) + ' minutes remaining';
                } else {
                    timeText = (timeRemaining / 3600).toFixed(1) + ' hours remaining';
                }

                uploadData.speedDisplay.textContent = speedText + ' - ' + timeText;
            } else {
                uploadData.speedDisplay.textContent = speedText;
            }

            // Update tracking data
            uploadData.lastUpdate = now;
            uploadData.lastBytes = file.size * file.progress();
        }
    });

    // Resumable.js success handler
    resumable.on('fileSuccess', function(file, response) {
        if (typeof response === 'string') {
            try {
                response = JSON.parse(response);
            } catch (e) {
                console.error('Failed to parse response:', e);
                return;
            }
        }

        document.querySelector(config.filePathElement).value = response.file_path;

        // Hide progress bar
        document.querySelector(config.filePreviewElement + ' .upload-progress').classList.add('d-none');

        // Update speed display
        if (uploadData.speedDisplay) {
            uploadData.speedDisplay.textContent = 'Upload complete!';
            if (config.onSpeedDisplayComplete) {
                config.onSpeedDisplayComplete(uploadData.speedDisplay);
            }
        }

        // Call success callback if provided
        if (config.onSuccess) {
            config.onSuccess(response);
        }
    });

    // Resumable.js error handler
    resumable.on('fileError', function(file, message) {
        resumable.cancel(); // Cancel all uploads
        document.querySelector(config.browseElement).style.display = 'block';
        document.querySelector(config.filePreviewElement).classList.add('d-none');

        // Call onError callback if provided
        if (config.onError) {
            config.onError(file, message);
        }

        // Extract error message from response if it's an object
        let errorMessage = 'Upload failed';
        let parsedResponse = null;

        try {
            parsedResponse = JSON.parse(message);
            if (parsedResponse.errors && parsedResponse.errors.file) {
                errorMessage = Array.isArray(parsedResponse.errors.file) ? parsedResponse.errors.file[0] : parsedResponse.errors.file;
            } else if (parsedResponse.message) {
                errorMessage = parsedResponse.message;
            }
        } catch (e) {
            // If we can't parse the message, just use it directly
            errorMessage = message;
        }

        // Log error to backend
        try {
            // Ensure we have a message to send
            const messageToLog = errorMessage || message || 'Unknown upload error occurred';

            fetch('/frontend/log-error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    type: 'upload_error',
                    message: messageToLog,
                    details: {
                        fileName: file.fileName || 'unknown',
                        fileSize: file.size || 0,
                        fileType: file.file ? file.file.type : 'unknown',
                        uniqueIdentifier: file.uniqueIdentifier || 'unknown',
                        chunkNumber: file.chunks ? file.chunks.length : 0,
                        rawMessage: message || 'no message provided',
                        parsedResponse: parsedResponse,
                        resumableError: file.error || null,
                        errorMessage: errorMessage || null,
                        originalMessage: message || null
                    },
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (logError) {
            console.error('Failed to log error to backend:', logError);
        }

        // Show error message in Bootstrap style
        document.querySelector(config.feedbackElement).innerHTML = `
            <div class="alert alert-danger d-flex align-items-center" role="alert">
                <i class="ki-duotone ki-shield-cross fs-2hx text-danger me-4"><span class="path1"></span><span class="path2"></span></i>
                <div>
                    ${errorMessage}
                </div>
            </div>
        `;
    });

    // Handle removing the file
    document.querySelector(config.removeButtonElement).addEventListener('click', function() {
        resumable.cancel(); // Cancel the upload and remove all files
        document.querySelector(config.browseElement).style.display = 'block';
        document.querySelector(config.filePreviewElement).classList.add('d-none');
        document.querySelector(config.filePathElement).value = '';
        document.querySelector(config.feedbackElement).innerHTML = '';

        // Clean up speed display if it exists
        if (uploadData.speedDisplay) {
            if (config.onSpeedDisplayCleanup) {
                config.onSpeedDisplayCleanup(uploadData.speedDisplay);
            } else {
                uploadData.speedDisplay.textContent = '';
            }
        }

        // Call onRemove callback if provided
        if (config.onRemove) {
            config.onRemove();
        }
    });

    // Add error event listener for network/chunking errors
    // resumable.on('error', function(message, file) {
    //     // Log network/chunk errors to backend
    //     try {
    //         // Ensure we have a message
    //         const errorMsg = message || 'Unknown network/chunk error';
    //         const logMessage = 'Network/chunk error: ' + errorMsg;

    //         fetch('/frontend/log-error', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    //             },
    //             body: JSON.stringify({
    //                 type: 'upload_error',
    //                 message: logMessage,
    //                 details: {
    //                     fileName: file ? file.fileName : 'unknown',
    //                     fileSize: file ? file.size : 0,
    //                     fileType: file && file.file ? file.file.type : 'unknown',
    //                     errorType: 'network_error',
    //                     rawMessage: message || 'no message provided',
    //                     fileObject: file ? {
    //                         fileName: file.fileName,
    //                         size: file.size,
    //                         relativePath: file.relativePath,
    //                         uniqueIdentifier: file.uniqueIdentifier
    //                     } : null
    //                 },
    //                 userAgent: navigator.userAgent,
    //                 url: window.location.href
    //             })
    //         });
    //     } catch (logError) {
    //         console.error('Failed to log network error to backend:', logError);
    //     }
    // });

    // Add drag and drop styling
    const dropzone = document.querySelector(config.dropElement);

    if (dropzone) {
        dropzone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
    }

    // Callers that tear the upload down again (message-thread.js destroy) cancel it through this
    return resumable;

    function truncateFilename(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
        const name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;

        if (name.length > 16) {
            return name.slice(0, 16) + '...' + extension;
        }

        return filename;
    }
};

