$(document).ready(function () {
    // load image smoothly 
    $("img").attr("loading", "lazy");

    alertify.set('notifier', 'position', 'bottom-right');
    alertify.set('notifier', 'delay', 10);

    // api request 
    window.ajaxRequest = function (url = "/api/v1/", formData, method = "GET", redirectUrl = false) {

        const requestMethod = method.toUpperCase();

        $('button[type="submit"]').prop('disabled', true);
        $.ajax({
            url: url,
            type: requestMethod,
            data: JSON.stringify(formData),
            contentType: 'application/json',
            processData: false,
            success: function (response) {
                if (response && response.success) {
                    alertify.success(response.message);
                }
                // Select all hidden input fields
                $('input[type="hidden"]').each(function () {
                    var inputName = $(this).attr('name');
                    localStorage.removeItem(inputName);
                });
                $("form").trigger("reset");
                if (redirectUrl) {
                    location.href = redirectUrl;
                }
            },
            error: function (error) {
                const response = error.responseJSON;
                if (response)
                    alertify.error(response.statusCode + " " + response.message);

                if (response?.statusCode === 401) {
                    location.href = "/users/login";
                }
            }
        });

        $('button[type="submit"]').prop('disabled', false);
    };

    // api request 
    window.ajaxResponseRequest = function (url = "/api/v1/", formData, method = "GET", redirectUrl = false) {

        const requestMethod = method.toUpperCase();

        $('button[type="submit"]').prop('disabled', true);
        return $.ajax({
            url: url,
            type: requestMethod,
            data: JSON.stringify(formData),
            contentType: 'application/json',
            processData: false,
            success: function (response) {
                $('button[type="submit"]').prop('disabled', false);
                if (response && response.success) {
                    return response;
                }
                $("form").trigger("reset");

                if (redirectUrl) {
                    location.href = redirectUrl;
                }
            },
            error: function (error) {
                $('button[type="submit"]').prop('disabled', false);
                return error
            }
        });
    };

    //silent api request 
    window.ajaxSilentRequest = function (url = "/api/v1/", formData, method = "GET", redirectUrl = false) {

        const requestMethod = method.toUpperCase();
        $('button[type="submit"]').prop('disabled', true);
        $.ajax({
            url: url,
            type: requestMethod,
            data: JSON.stringify(formData),
            contentType: 'application/json',
            processData: false,
            success: function (response) {
            },
            error: function (error) {
                const response = error.responseJSON;

            }
        });
        $('button[type="submit"]').prop('disabled', false);
    };

    ajaxFileUpload = function (url, fileInputElement, hiddenInputField, allowMultiple = false, cropRatio = false, width = 200, height = 200) {
        // Check if FilePond is loaded
        if (typeof FilePond === "undefined") {
            console.error("FilePond is not loaded.");
            return;
        }

        if (!document.querySelector(fileInputElement)) {
            // console.error("File input element not found:", fileInputElement);
            return;
        }

        // Select all hidden input fields and set their values from localStorage
        $('input[type="hidden"]').each(function () {
            var inputName = $(this).attr('name');
            let imgSrc = localStorage.getItem(inputName);
            if (imgSrc) {
                $(this).val(imgSrc);
                $(`#${inputName}img`).attr("src", "/" + imgSrc);
            }
        });

        // Register FilePond plugins only once (prevent re-registration)
        if (!window.filePondPluginsRegistered) {
            FilePond.registerPlugin(
                FilePondPluginImagePreview,
                FilePondPluginImageCrop,
                FilePondPluginImageResize,
                FilePondPluginImageTransform,
                FilePondPluginImageEdit
            );
            window.filePondPluginsRegistered = true; // Flag to prevent duplicate registrations
        }

        // Destroy existing FilePond instance if it already exists
        const existingPond = FilePond.find(document.querySelector(fileInputElement));
        if (existingPond) {
            existingPond.destroy();
        }

        // Create a new instance of FilePond for the given file input element
        const pond = FilePond.create(document.querySelector(fileInputElement));

        // Set FilePond instance-specific options
        pond.setOptions({
            allowMultiple: allowMultiple,
            allowImagePreview: true,
            allowImageCrop: cropRatio ? true : false,
            allowImageResize: true,
            allowImageEdit: true,
            imageCropAspectRatio: cropRatio ? cropRatio : null, // Apply crop ratio if provided
            imageResizeTargetWidth: width,
            imageResizeTargetHeight: height,
            server: {
                process: {
                    url: url, // Set the dynamic URL here
                    method: 'POST',
                    headers: {},
                    withCredentials: true,
                    onload: (response) => {
                        try {
                            const responseData = JSON.parse(response);
                            alertify.success(responseData.message);

                            let uploadedUrl;
                            if (hiddenInputField) {
                                uploadedUrl = responseData.data.path.replace(/^public[\\/]/, ""); // Remove "public/" or "public\"
                                localStorage.setItem(hiddenInputField, uploadedUrl);
                                $(`#${hiddenInputField}`).val(uploadedUrl);
                                $(`#${hiddenInputField}img`).attr("src", "/" + uploadedUrl);
                            }
                            return response;
                        } catch (error) {
                            console.error("Error parsing response:", error);
                        }
                    },
                    onerror: (response) => {
                        console.error("Error during file upload:", response);
                        return response;
                    },
                },
                revert: url, // You can customize the revert URL as well if needed
                restore: null,
                load: null,
            },
        });

        // Handle file process completion event
        pond.on('processfile', (error, file) => {
            if (error) {
                console.error('File processing failed:', error);
                try {
                    const response = JSON.parse(error.body);
                    if (error.type === "error") {
                        alertify.error(response.statusCode + ": " + response.message);
                    }
                } catch (parseError) {
                    console.error("Error parsing file process error response:", parseError);
                }
            }
        });
    };



    if ($("#businessCategory").length) {
        // Initialize Select2
        $('#businessCategory').select2({
            tags: true, // Enable tagging
            placeholder: "Select or add new",
            allowClear: true
        });

        $('#businessCategory').on('select2:select', function (e) {
            // console.log($(this).find('.newItem').val());
            if (e.params.data.id === "") {
                // Show the input if no category is selected
                $('.newItem').show().val(''); // Clear any existing input
            } else {
                // Hide the input if a valid category is selected
                $('.newItem').hide();
            }
        });
    }


    // Reverse geocode using backend API
    window.reverseGeoCode = function (latitude, longitude, callback) {
        const payload = { latitude, longitude };

        ajaxResponseRequest(`/api/v1/utilities/reverse-geocode-web?web=1`, payload, "POST", false)
            .then((result) => {
                console.log("Reverse geocode result:", result);

                // Expect: result.data is an array of Google results
                if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                    const firstResult = result.data[0];
                    const address = firstResult.formatted_address;
                    const addressComponents = firstResult.address_components;

                    let city = "", state = "", pincode = "";
                    addressComponents.forEach(component => {
                        const types = component.types;
                        if (types.includes("locality")) city = component.long_name;
                        if (types.includes("administrative_area_level_1")) state = component.long_name;
                        if (types.includes("postal_code")) pincode = component.long_name;
                    });

                    callback({ address, addressComponents, city, pincode, state });
                } else {
                    console.error("Reverse geocode API failed or returned no result");
                    callback(null);
                }
            })
            .catch((err) => {
                console.error("Reverse geocode API error:", err);
                callback(null);
            });
    };


    // share 
    $(".shareBtn").click(function () {
        let title = $(this).data("title");
        let content = $(this).data("content");
        let url = $(this).data("url");
        if (navigator.share) {
            navigator.share({
                title: title,
                text: content,
                url: url
            }).then(() => { }).catch((error) => {
                console.error('Error sharing content:', error);
            });
        } else {
            alert('Web Share API not supported.');
        }
    });


    // Change password visibility
    $('.togglePasswordBtn').click(function () {
        // Find the input field with class 'password' inside the same container
        const passwordField = $(this).closest('div').find('input.password');
        const icon = $(this).find("i");

        // Toggle password field type
        const fieldType = passwordField.attr('type') === 'password' ? 'text' : 'password';
        passwordField.attr('type', fieldType);

        // Toggle icon based on library
        if (icon.hasClass('fa')) {
            icon.toggleClass('fa-eye fa-eye-slash'); // For Font Awesome
        } else {
            icon.toggleClass('bx-hide bx-show'); // For Boxicons
        }
    });





    // service working web push notification 
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(async function (registration) {
                console.log('Service Worker registered');

                // Ask for permission to show notifications
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    return registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: 'BEFFjv-NNTFzQsSXzRh8CkBjjjxJ97jdOjZj2zCQ8iRFpQwbxop6rK5BVOH0fqAsVfZvleHd5Fgl1ovv4ZyEeB0',
                    });
                }
            })
            .then(function (subscription) {
                if (!document.cookie.includes('pushNotification=true')) {
                    // Send subscription to the server
                    fetch('/api/v1/utilities/subscribe-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(subscription),
                    });
                }
            })
            .catch(function (error) {
                console.error('Error during service worker registration or push subscription:', error);
            });
    } else {
        console.error('Push notifications are not supported in this browser');
    }


    // install pwa app
    let deferredPrompt;
    const $installAppButton = $('#installAppButton');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    $installAppButton.click(async function () {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const choiceResult = await deferredPrompt.userChoice;
                deferredPrompt = null;
            } catch (error) {
                console.error('Error showing install prompt:', error);
            }
        }
    });

    window.addEventListener('appinstalled', (event) => {
        alertify.success('Thank you for installing Bizmapi App');
    });



    // toggle file uploader 
    $(".fileuploadEditBtn").click(function () {
        // Find the parent div of the clicked button and then find the next .jsfilePondUploader sibling div
        $(this).parent().next(".jsfilePondUploader").toggleClass("d-none");
    });



    // generate post dynamic 
    window.generatePostHTML = (post) => {
        const userId = post.userId?._id || "";
        const userName = post.userId?.fullName || "Unknown User";
        const userAvatar = post.userId?.avatar || "";
        const createdAt = new Date(post.createdAt).toLocaleString();


        console.log(userId);
        console.log("window", window.currentUserId);

        


        // when post is createby logged in user 
        let postMenuOptions = "";
        let messageButton = "";
        if (window.currentUserId === userId) {
            postMenuOptions = `
              <button class="postMenuBtn p-2 text-primary-blue hover:bg-blue-50 rounded-full transition" data-post-owner-id="B" data-owner-name="User B" data-is-friend="true">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        </button>

        <div class="postMenu hidden absolute right-0 mt-3 top-4 w-48 bg-white rounded-lg shadow-xl py-1 border border-gray-100 z-40">
            <button data-post-id="${post._id}" class="editPostBtn w-full cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Edit
            </button>
            <button data-post-id="${post._id}" class="deletePostBtn w-full cursor-pointer px-4 py-2 text-sm text-red-700 hover:bg-red-100">
                Delete
            </button>
        </div>
            `;
        }else{
        messageButton = `<div class="flex justify-center items-center pt-3 border-t-gray-300">
        <button data-post-user-id="${userId}" data-post-user-name="${userName}"  class="post-chat-trigger w-full py-2 rounded text-gray-500 hover:bg-gray-100 font-medium text-sm">💬 Message</button>
      </div>`;
        }


        let mediaHTML = "";
        if (post.image) {
            mediaHTML = `
      <div class="post-media-container mb-4 overflow-hidden rounded-lg shadow-lg">
        <img loading="lazy" src="${post.image}" class="w-full h-auto object-cover" />
      </div>`;
        }
        if (post.video) {
            mediaHTML = `
      <div class="post-media-container aspect-video mb-4 overflow-hidden rounded-lg shadow-lg bg-black">
        <video class="post-video w-full h-full" controls loop preload="metadata">
          <source src="${post.video}" type="video/mp4">
        </video>
      </div>`;
        }

        return `
    <div class="w-full post-card bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-4" data-post-id="${post._id}">
      <div class="flex items-start justify-between mb-4 relative">
        <div class="flex items-center">
          <div class="relative">
            <img loading="lazy" src="${userAvatar}"
              class="w-12 h-12 rounded-full object-cover">
          </div>
          <div class="ml-3">
            <p class="font-bold text-gray-900 leading-snug">${userName}</p>
            <p class="text-xs text-gray-500">${createdAt}</p>
          </div>
        </div>
      ${postMenuOptions}
      </div>

      <p class="text-gray-800 mb-4 leading-relaxed">${post.title}</p>

      ${mediaHTML}

      ${messageButton}
    </div>
  `;
    }



    // Toggle specific post menu
    $(document).on("click", ".postMenuBtn", function (e) {
        e.stopPropagation();

        // hide all menus first
        $(".postMenu").addClass("hidden");

        // toggle the clicked one
        $(this).next(".postMenu").toggleClass("hidden");
    });

    // click outside → close all menus
    $(document).on("click", function () {
        $(".postMenu").addClass("hidden");
    });


    // delete post 
    $(document).on("click", ".deletePostBtn", function (e) {
        e.stopPropagation();

        if (!confirm("Are you sure to delete this post?")) {
            return;
        }

        // toggle the clicked one
        let postId = $(this).data("post-id");

        ajaxResponseRequest(`/api/v1/posts/${postId}`, {}, "DELETE", false).then((result) => {
            if (result.success) {
                $(`div[data-post-id="${postId}"]`).fadeOut(200, function () {
                    $(this).remove();
                });
            }
        }).catch((e) => {
            console.log(e);

        })
    });


    // edit post 
    $(document).on("click", ".editPostBtn", function (e) {
        e.stopPropagation();

        // toggle the clicked one
        let postId = $(this).data("post-id");

        ajaxResponseRequest(`/api/v1/posts/edit/${postId}`, {}, "GET", false).then((result) => {
            console.log(result);
            
            if (result.success) {
                    $("#postmodeltitle").text("Update");
                    $("#post-text").val(result.data.title);
                    $("#imageVideoContainer").hide();
                    $("input[name=editpostid]").val(result.data._id);

                 $('#post-creation-modal').removeClass('hidden');
                    setTimeout(() => {
                        $('#modal-content').removeClass('scale-95 opacity-0').addClass('scale-100 opacity-100');
                    }, 10);
            }
        }).catch((e) => {
            console.log(e);

        })
    });





});


window.onload = function () {
    const loader = document.querySelector("#loader");
    if (loader) {
        loader.style.display = "none";
    }
}

// Global broken image handler
function addImgErrorHanlder() {
    const fallbackUrl = 'https://placehold.co/60x60/F0F4F8/6C757D?text=No+Img';

    const applyHandler = img => {
        img.onerror = () => {
            if (img.src !== fallbackUrl) {
                img.src = fallbackUrl;
            }
        };
    };

    // Handle existing images
    document.querySelectorAll('img').forEach(applyHandler);

    // Watch for dynamically added images
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName === 'IMG') {
                    applyHandler(node);
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('img').forEach(applyHandler);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}




addImgErrorHanlder();

