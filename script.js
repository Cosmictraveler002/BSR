// ==========================================================================
// বাঙালির শখের রান্নাঘর - Pure Vanilla JavaScript Controls
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // --- Performance Utilities (Throttle, Debounce, Mobile Detection) ---
    // ==========================================================================
    const IS_MOBILE = window.innerWidth <= 768;
    if (IS_MOBILE) document.body.classList.add('is-mobile');

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    function debounce(func, wait = 250) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // --- Double Confirmation Pop-up Helper for Database Deletions ---
    function confirmDoubleDelete(itemName) {
        const step1 = confirm(`⚠️ STEP 1 of 2: Are you SURE you want to delete ${itemName} from the database?`);
        if (!step1) return false;
        const step2 = confirm(`🚨 FINAL WARNING (STEP 2 of 2): Permanent database deletion of ${itemName}. Are you 100% sure? This action CANNOT be undone!`);
        return step2;
    }

    // --- Force scroll to Top / Hero section on reload (except Admin Portal) ---
    if (!document.body.classList.contains('admin-page-body')) {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        if (window.location.hash) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }

    // --- Full-Screen Asset Preloader with Progress Tracking ---
    (function initAppPreloader() {
        const preloader = document.getElementById('app-preloader');
        const progressBar = document.getElementById('preloader-progress-bar');
        const percentText = document.getElementById('preloader-percent');

        if (!preloader) return;

        const _preloadW = IS_MOBILE ? 800 : 2000;
        const urlsToPreload = [
            'BSR 01 cmyk.png',
            `https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=${_preloadW}&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=${_preloadW}&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1606491956689-2ea866880c84?q=80&w=${_preloadW}&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=${_preloadW}&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=${_preloadW}&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=${_preloadW}&auto=format&fit=crop`
        ];

        document.querySelectorAll('img').forEach(img => {
            if (img.src && !urlsToPreload.includes(img.src)) {
                urlsToPreload.push(img.src);
            }
        });

        let loadedCount = 0;
        const totalAssets = urlsToPreload.length;
        let progress = 0;

        function updateProgress(targetPercent) {
            progress = Math.min(100, Math.max(progress, targetPercent));
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (percentText) percentText.textContent = `${Math.round(progress)}%`;
        }

        const loadPromises = urlsToPreload.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = img.onerror = () => {
                    loadedCount++;
                    const percent = (loadedCount / totalAssets) * 100;
                    updateProgress(percent);
                    resolve();
                };
                img.src = url;
            });
        });

        const minDisplayDuration = 700;

        Promise.all([
            Promise.all(loadPromises),
            new Promise(res => setTimeout(res, minDisplayDuration))
        ]).then(() => {
            updateProgress(100);
            setTimeout(() => {
                if (!document.body.classList.contains('admin-page-body')) window.scrollTo(0, 0);
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    if (document.body.contains(preloader)) preloader.remove();
                }, 600);
            }, 200);
        });

        setTimeout(() => {
            if (document.body.contains(preloader)) {
                updateProgress(100);
                if (!document.body.classList.contains('admin-page-body')) window.scrollTo(0, 0);
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    if (document.body.contains(preloader)) preloader.remove();
                }, 600);
            }
        }, 3500);
    })();
    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    function toggleMobileMenu(show) {
        if (!mobileMenu) return;
        if (show) {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => toggleMobileMenu(true));
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => toggleMobileMenu(false));
    if (mobileMenu) {
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) toggleMobileMenu(false);
        });
    }

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                toggleMobileMenu(false);
                if (target) {
                    setTimeout(() => {
                        requestAnimationFrame(() => {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    }, 320);
                }
            } else {
                toggleMobileMenu(false);
            }
        });
    });

    // --- Table Reservation Modal ---
    const openReserveBtn = document.getElementById('open-reserve-btn');
    const heroReserveBtn = document.getElementById('hero-reserve-btn');
    const mobileReserveBtn = document.getElementById('mobile-reserve-btn');
    const eventInquireBtn = document.getElementById('event-inquire-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const reservationModal = document.getElementById('reservation-modal');
    const reservationForm = document.getElementById('reservation-form');

    function toggleReservationModal(show) {
        if (!reservationModal) return;
        if (show) {
            reservationModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (lenis) lenis.stop();
        } else {
            reservationModal.classList.remove('active');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }
    }

    // --- Mobile Bottom Navigation Interactivity ---
    const mnavHome = document.getElementById('mnav-home');
    const mnavMenu = document.getElementById('mnav-menu');
    const mnavReserve = document.getElementById('mnav-reserve');
    const mnavCart = document.getElementById('mnav-cart');

    let userSelectedMobileNav = null;

    function setActiveMobileNavItem(activeEl) {
        userSelectedMobileNav = activeEl;
        [mnavHome, mnavMenu, mnavReserve, mnavCart].forEach(item => {
            if (item) item.classList.remove('active');
        });
        if (activeEl) activeEl.classList.add('active');
    }

    // ==========================================================================
    // --- Lenis + GSAP ScrollTrigger Premium Smooth Scroll & Visual Reactivity ---
    // ==========================================================================
    let lenis = null;

    if (typeof Lenis !== 'undefined') {
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);

        // Apple-like Weighted Physics Setup:
        // lerp: 0.08 & wheelMultiplier: 1.2 for controlled inertia without floaty "slipping on ice" feel
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo decay curve
            lerp: 0.08,
            wheelMultiplier: 1.2,
            touchMultiplier: 1.0,
            smoothWheel: true,
            smoothTouch: false, // Explicitly disabled on touch devices to maintain native accessibility
            syncTouch: false
        });

        // GSAP ScrollTrigger Synchronization via rAF Ticker
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

            // Synchronize GSAP ScrollTrigger on every Lenis scroll tick
            lenis.on('scroll', ScrollTrigger.update);

            // Drive Lenis scroll engine using GSAP's 60fps ticker
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });

            // Prevent lag smoothing delays for 1:1 frame responsiveness
            gsap.ticker.lagSmoothing(0);

            // ----------------------------------------------------------------------
            // Visual Reactivity Animations (Hardware-Accelerated: transform & opacity)
            // ----------------------------------------------------------------------
            if (!isTouchDevice) {
                // 1. Subtle Text Reveal: Text block fades in and slides up (y: 30px -> 0px) as it enters viewport
                gsap.utils.toArray('.gsap-text-reveal, .story-title, .menu-title, .contact-title, .feature-title, .section-label').forEach(textEl => {
                    gsap.fromTo(textEl,
                        { opacity: 0, y: 30 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.9,
                            ease: "power2.out",
                            scrollTrigger: {
                                trigger: textEl,
                                start: "top 88%",
                                toggleActions: "play none none reverse"
                            }
                        }
                    );
                });

                // 2. Subtle Parallax: Image moves slightly slower than scroll speed for premium depth
                gsap.utils.toArray('.gsap-parallax-img, .story-image-frame img, .hero-image-card img').forEach(imgEl => {
                    const parentWrap = imgEl.closest('.gsap-parallax-wrap, .story-image-frame, .hero-image-card') || imgEl.parentElement;
                    gsap.fromTo(imgEl,
                        { yPercent: -12 },
                        {
                            yPercent: 12,
                            ease: "none",
                            scrollTrigger: {
                                trigger: parentWrap,
                                start: "top bottom",
                                end: "bottom top",
                                scrub: true
                            }
                        }
                    );
                });
            }
        } else {
            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        }

        // Connect anchor links through Lenis physics engine
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId && targetId !== '#' && targetId.length > 1) {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        e.preventDefault();
                        lenis.scrollTo(targetEl, { offset: -70, duration: 1.2 });
                    }
                }
            });
        });
    }

    function handleMnavHome(e) {
        if (e) e.preventDefault();
        setActiveMobileNavItem(mnavHome);
        if (lenis) {
            lenis.scrollTo(0, { duration: 1.0 });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function handleMnavMenu(e) {
        if (e) e.preventDefault();
        setActiveMobileNavItem(mnavMenu);
        const menuSection = document.getElementById('menu');
        if (menuSection) {
            if (lenis) {
                lenis.scrollTo(menuSection, { offset: -70, duration: 1.1 });
            } else {
                menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            window.location.hash = 'menu';
        }
    }

    function handleMnavReserve(e) {
        if (e) e.preventDefault();
        setActiveMobileNavItem(mnavReserve);
        initReservationDateTimeValidation();
        toggleReservationModal(true);
    }

    function handleMnavCart(e) {
        if (e) e.preventDefault();
        setActiveMobileNavItem(mnavCart);
        toggleCartDrawer(true);
    }

    if (mnavHome) {
        mnavHome.addEventListener('click', handleMnavHome);
        mnavHome.addEventListener('touchend', (e) => { e.preventDefault(); handleMnavHome(e); }, { passive: false });
    }
    if (mnavMenu) {
        mnavMenu.addEventListener('click', handleMnavMenu);
        mnavMenu.addEventListener('touchend', (e) => { e.preventDefault(); handleMnavMenu(e); }, { passive: false });
    }
    if (mnavReserve) {
        mnavReserve.addEventListener('click', handleMnavReserve);
        mnavReserve.addEventListener('touchend', (e) => { e.preventDefault(); handleMnavReserve(e); }, { passive: false });
    }
    if (mnavCart) {
        mnavCart.addEventListener('click', handleMnavCart);
        mnavCart.addEventListener('touchend', (e) => { e.preventDefault(); handleMnavCart(e); }, { passive: false });
    }

    // Scroll spy for mobile bottom nav active state
    window.addEventListener('scroll', throttle(() => {
        if (window.innerWidth <= 768 && (!userSelectedMobileNav || userSelectedMobileNav === mnavHome || userSelectedMobileNav === mnavMenu)) {
            const menuSection = document.getElementById('menu');
            if (menuSection) {
                const rect = menuSection.getBoundingClientRect();
                if (rect.top <= 250 && rect.bottom >= 150) {
                    setActiveMobileNavItem(mnavMenu);
                    return;
                }
            }
            if (window.scrollY < 300) {
                setActiveMobileNavItem(mnavHome);
            }
        }
    }, 200), { passive: true });



    // --- Real Date & Time Validation for Table Reservations ---
    function initReservationDateTimeValidation() {
        const resDateInput = document.getElementById('res-date');
        const resTimeSelect = document.getElementById('res-time');
        if (!resDateInput || !resTimeSelect) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        resDateInput.min = todayStr;
        if (!resDateInput.value || resDateInput.value < todayStr) {
            resDateInput.value = todayStr;
        }

        function validateAndFilterTimeSlots() {
            const selectedDate = resDateInput.value;
            if (selectedDate < todayStr) {
                showToast('⚠️ Past dates cannot be selected for reservations.');
                resDateInput.value = todayStr;
            }

            const isToday = (resDateInput.value === todayStr);
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinute;

            const slotMap = [
                { value: "12:30 PM (Lunch)", timeMins: 750 },
                { value: "02:00 PM (Lunch)", timeMins: 840 },
                { value: "07:30 PM (Dinner)", timeMins: 1170 },
                { value: "09:00 PM (Dinner)", timeMins: 1260 }
            ];

            let validSlotsCount = 0;
            Array.from(resTimeSelect.options).forEach(opt => {
                const slot = slotMap.find(s => s.value === opt.value);
                if (isToday && slot && slot.timeMins <= currentTimeInMinutes + 30) {
                    opt.disabled = true;
                } else {
                    opt.disabled = false;
                    validSlotsCount++;
                }
            });

            if (isToday && validSlotsCount === 0) {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tYear = tomorrow.getFullYear();
                const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
                const tDay = String(tomorrow.getDate()).padStart(2, '0');
                resDateInput.value = `${tYear}-${tMonth}-${tDay}`;
                
                Array.from(resTimeSelect.options).forEach(opt => {
                    opt.disabled = false;
                });
                showToast("⏰ Today's reservation slots are closed. Reservation date set to tomorrow.");
            }

            if (resTimeSelect.selectedOptions[0] && resTimeSelect.selectedOptions[0].disabled) {
                const firstAvailable = Array.from(resTimeSelect.options).find(o => !o.disabled);
                if (firstAvailable) resTimeSelect.value = firstAvailable.value;
            }
        }

        resDateInput.addEventListener('change', validateAndFilterTimeSlots);
        validateAndFilterTimeSlots();
    }

    // Initialize reservation date/time limits
    initReservationDateTimeValidation();

    [openReserveBtn, heroReserveBtn, mobileReserveBtn, eventInquireBtn, mnavReserve].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                toggleMobileMenu(false);
                initReservationDateTimeValidation();
                toggleReservationModal(true);
            });
        }
    });

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => toggleReservationModal(false));
    if (reservationModal) {
        reservationModal.addEventListener('click', (e) => {
            if (e.target === reservationModal) toggleReservationModal(false);
        });
    }


    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const typeEl = document.getElementById('res-type');
            const nameEl = document.getElementById('res-name');
            const phoneEl = document.getElementById('res-phone');
            const emailEl = document.getElementById('res-email');
            const guestsEl = document.getElementById('res-guests');
            const dateEl = document.getElementById('res-date');
            const timeEl = document.getElementById('res-time');
            const reqEl = document.getElementById('res-requests');

            const category = typeEl ? typeEl.value : 'Table Booking';

            const outletEl = document.getElementById('res-outlet-id');
            const outletId = outletEl ? outletEl.value : 'OUTLET-01';

            if (category === 'Private Event') {
                const eventPayload = {
                    organizer_name: nameEl ? nameEl.value.trim() : 'Guest',
                    phone: phoneEl ? phoneEl.value.trim() : 'N/A',
                    email: emailEl && emailEl.value ? emailEl.value.trim() : null,
                    event_type: 'Private Dining & Event',
                    guest_count: guestsEl ? parseInt(guestsEl.value) || 10 : 10,
                    event_date: dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0],
                    event_time: timeEl && timeEl.value ? timeEl.value : '19:00',
                    special_notes: reqEl && reqEl.value ? reqEl.value.trim() : null,
                    outlet_id: outletId
                };

                try {
                    const res = await fetch('/api/private-events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(eventPayload)
                    });
                    if (res.ok) {
                        toggleReservationModal(false);
                        showToast('🎉 Private Event inquiry submitted successfully!');
                        reservationForm.reset();
                        renderAdminDashboard();
                        loadInlineReservations();
                    } else {
                        const err = await res.json();
                        let errorMsg = 'Failed to submit private event inquiry.';
                        if (err.detail) {
                            errorMsg = Array.isArray(err.detail) ? err.detail.map(d => d.msg).join(', ') : err.detail;
                        }
                        showToast(errorMsg);
                    }
                } catch (err) {
                    showToast('Network error while submitting private event inquiry.');
                }
            } else {
                const payload = {
                    guest_name: nameEl ? nameEl.value.trim() : 'Guest',
                    phone: phoneEl ? phoneEl.value.trim() : 'N/A',
                    email: emailEl && emailEl.value ? emailEl.value.trim() : null,
                    guests_count: guestsEl ? parseInt(guestsEl.value) || 2 : 2,
                    reservation_date: dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0],
                    reservation_time: timeEl && timeEl.value ? timeEl.value : '19:00',
                    special_request: reqEl && reqEl.value ? reqEl.value.trim() : null,
                    event_type: 'Table Booking',
                    outlet_id: outletId
                };

                try {
                    const res = await fetch('/api/reservations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        toggleReservationModal(false);
                        showToast('🍽️ Your table reservation has been confirmed!');
                        reservationForm.reset();
                        renderAdminDashboard();
                        loadInlineReservations();
                    } else {
                        const err = await res.json();
                        let errorMsg = 'Failed to submit table reservation.';
                        if (err.detail) {
                            errorMsg = Array.isArray(err.detail) ? err.detail.map(d => d.msg).join(', ') : err.detail;
                        }
                        showToast(errorMsg);
                    }
                } catch (err) {
                    showToast('Network error while submitting table reservation.');
                }
            }
        });
    }

    // --- Privacy Policy & Terms Modals ---
    const openPrivacyBtn = document.getElementById('open-privacy-btn');
    const closePrivacyBtn = document.getElementById('close-privacy-btn');
    const privacyModal = document.getElementById('privacy-modal');

    const openTermsBtn = document.getElementById('open-terms-btn');
    const closeTermsBtn = document.getElementById('close-terms-btn');
    const termsModal = document.getElementById('terms-modal');

    function toggleLegalModal(modal, show) {
        if (!modal) return;
        if (show) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (lenis) lenis.stop();
        } else {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }
    }

    if (openPrivacyBtn) openPrivacyBtn.addEventListener('click', () => toggleLegalModal(privacyModal, true));
    if (closePrivacyBtn) closePrivacyBtn.addEventListener('click', () => toggleLegalModal(privacyModal, false));
    if (privacyModal) privacyModal.addEventListener('click', (e) => { if (e.target === privacyModal) toggleLegalModal(privacyModal, false); });

    if (openTermsBtn) openTermsBtn.addEventListener('click', () => toggleLegalModal(termsModal, true));
    if (closeTermsBtn) closeTermsBtn.addEventListener('click', () => toggleLegalModal(termsModal, false));
    if (termsModal) termsModal.addEventListener('click', (e) => { if (e.target === termsModal) toggleLegalModal(termsModal, false); });

    // --- Menu Slider & Touch Swipe Controller ---
    const dishesSliderWrap = document.querySelector('.dishes-slider-wrap');
    const menuPrevBtn = document.getElementById('menu-prev-btn');
    const menuNextBtn = document.getElementById('menu-next-btn');

    if (dishesSliderWrap) {
        if (menuPrevBtn) {
            menuPrevBtn.addEventListener('click', () => {
                const card = dishesSliderWrap.querySelector('.dish-card');
                const scrollAmount = card ? card.offsetWidth + 24 : 320;
                dishesSliderWrap.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });
        }

        if (menuNextBtn) {
            menuNextBtn.addEventListener('click', () => {
                const card = dishesSliderWrap.querySelector('.dish-card');
                const scrollAmount = card ? card.offsetWidth + 24 : 320;
                dishesSliderWrap.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });
        }

        // Mouse Drag / Touch Drag Support for Smooth Swiping
        let isDown = false;
        let startX;
        let scrollLeft;
        let velocity = 0;
        let lastX = 0;
        let momentumID;

        dishesSliderWrap.addEventListener('mousedown', (e) => {
            isDown = true;
            dishesSliderWrap.style.cursor = 'grabbing';
            startX = e.pageX - dishesSliderWrap.offsetLeft;
            scrollLeft = dishesSliderWrap.scrollLeft;
            lastX = e.pageX;
            velocity = 0;
            cancelAnimationFrame(momentumID);
        });

        function applyMomentum() {
            if (Math.abs(velocity) > 0.5) {
                dishesSliderWrap.scrollLeft -= velocity * 1.4;
                velocity *= 0.94;
                momentumID = requestAnimationFrame(applyMomentum);
            }
        }

        dishesSliderWrap.addEventListener('mouseleave', () => {
            if (isDown) applyMomentum();
            isDown = false;
            dishesSliderWrap.style.cursor = '';
        });

        dishesSliderWrap.addEventListener('mouseup', () => {
            if (isDown) applyMomentum();
            isDown = false;
            dishesSliderWrap.style.cursor = '';
        });

        dishesSliderWrap.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - dishesSliderWrap.offsetLeft;
            const walk = (x - startX) * 1.5;
            velocity = e.pageX - lastX;
            lastX = e.pageX;
            dishesSliderWrap.scrollLeft = scrollLeft - walk;
        });
    }

    // ==========================================================================
    // --- Local Database & Cart / Checkout System ---
    // ==========================================================================
    const bsrDB = {
        // Cart Storage
        getCart: function () {
            try {
                return JSON.parse(localStorage.getItem('bsr_cart') || '[]');
            } catch (e) {
                return [];
            }
        },
        saveCart: function (cartData) {
            localStorage.setItem('bsr_cart', JSON.stringify(cartData));
        },

        // Orders Storage (Database Collection)
        getOrders: function () {
            try {
                return JSON.parse(localStorage.getItem('bsr_orders') || '[]');
            } catch (e) {
                return [];
            }
        },
        saveOrder: function (orderRecord) {
            const orders = this.getOrders();
            orders.unshift(orderRecord); // Newest order first
            localStorage.setItem('bsr_orders', JSON.stringify(orders));
            return orders;
        },
        deleteOrder: function (orderId) {
            let orders = this.getOrders();
            orders = orders.filter(o => String(o.id) !== String(orderId));
            localStorage.setItem('bsr_orders', JSON.stringify(orders));
            return orders;
        },
        clearOrders: function () {
            localStorage.removeItem('bsr_orders');
        },

        // Saved Customer Info
        getCustomerInfo: function () {
            try {
                return JSON.parse(localStorage.getItem('bsr_customer') || '{}');
            } catch (e) {
                return {};
            }
        },
        saveCustomerInfo: function (info) {
            localStorage.setItem('bsr_customer', JSON.stringify(info));
        }
    };

    // UI Element Handles
    const cartBtn = document.getElementById('cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartBadge = document.getElementById('cart-badge');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSubtotalVal = document.getElementById('cart-subtotal-val');
    const cartTotalElement = document.getElementById('cart-total');
    const emptyCartMsg = document.getElementById('empty-cart-msg');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const checkoutBtn = document.getElementById('checkout-btn');

    // Modals
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutBtn = document.getElementById('close-checkout-btn');
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutItemList = document.getElementById('checkout-item-list');

    const receiptModal = document.getElementById('receipt-modal');
    const closeReceiptBtn = document.getElementById('close-receipt-btn');
    const receiptDetails = document.getElementById('receipt-details');
    const printReceiptBtn = document.getElementById('print-receipt-btn');
    const viewOrdersBtn = document.getElementById('view-orders-btn');

    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const ordersHistoryBtn = document.getElementById('orders-history-btn');
    const ordersBadge = document.getElementById('orders-badge');

    // Coupons
    const couponInput = document.getElementById('coupon-input');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponMessage = document.getElementById('coupon-message');

    // Load initial cart from database
    let cart = bsrDB.getCart();
    let appliedCoupon = null; // { code: 'BENGAL10', rate: 0.10 }

    function toggleCartDrawer(show) {
        if (!cartDrawer) return;
        if (show) {
            cartDrawer.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (lenis) lenis.stop();
        } else {
            cartDrawer.classList.remove('active');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }
    }

    if (cartBtn) cartBtn.addEventListener('click', () => toggleCartDrawer(true));
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCartDrawer(false));
    if (cartDrawer) {
        cartDrawer.addEventListener('click', (e) => {
            if (e.target === cartDrawer) toggleCartDrawer(false);
        });
    }

    // Add to Cart Handlers
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.name;
            const price = parseInt(btn.dataset.price);

            const card = btn.closest('.dish-card');
            const imgSrc = card ? card.querySelector('.dish-img-wrap img')?.src : '';

            const existingItem = cart.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ name, price, quantity: 1, image: imgSrc });
            }

            bsrDB.saveCart(cart);
            updateCartUI();
            showToast(`${name} added to cart!`);
        });
    });

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            cart = [];
            bsrDB.saveCart(cart);
            updateCartUI();
            showToast('Cart cleared!');
        });
    }

    function updateCartUI() {
        // Update badge count
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            if (totalItems > 0) {
                cartBadge.textContent = totalItems;
                cartBadge.classList.remove('hidden');
            } else {
                cartBadge.classList.add('hidden');
            }
        }

        const mobileCartBadge = document.getElementById('mobile-cart-badge');
        if (mobileCartBadge) {
            if (totalItems > 0) {
                mobileCartBadge.textContent = totalItems;
                mobileCartBadge.classList.remove('hidden');
            } else {
                mobileCartBadge.classList.add('hidden');
            }
        }

        // Update Order History Badge
        const pastOrders = bsrDB.getOrders();
        if (ordersBadge) {
            if (pastOrders.length > 0) {
                ordersBadge.textContent = pastOrders.length;
                ordersBadge.classList.remove('hidden');
            } else {
                ordersBadge.classList.add('hidden');
            }
        }

        // Render Cart Drawer Items
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.appendChild(emptyCartMsg);
            if (cartSubtotalVal) cartSubtotalVal.textContent = '₹0';
            if (cartTotalElement) cartTotalElement.textContent = '₹0';
        } else {
            let subtotal = 0;
            cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const itemRow = document.createElement('div');
                itemRow.className = 'cart-item-row';
                itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed var(--color-border-subtle);';
                itemRow.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">` : ''}
                        <div>
                            <h4 class="font-bengali" style="font-weight: 700; font-size: 0.9rem; color: var(--color-primary); margin: 0;">${item.name}</h4>
                            <span style="font-size: 0.75rem; color: var(--color-text-muted);">₹${item.price} each</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="qty-stepper">
                            <button class="qty-btn dec-btn" data-index="${index}">-</button>
                            <span class="qty-val">${item.quantity}</span>
                            <button class="qty-btn inc-btn" data-index="${index}">+</button>
                        </div>
                        <span style="font-weight: 700; font-size: 0.9rem; min-width: 48px; text-align: right;">₹${itemTotal}</span>
                    </div>
                `;
                cartItemsContainer.appendChild(itemRow);
            });

            // Quantity stepper listeners
            document.querySelectorAll('.dec-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    if (cart[idx].quantity > 1) {
                        cart[idx].quantity -= 1;
                    } else {
                        cart.splice(idx, 1);
                    }
                    bsrDB.saveCart(cart);
                    updateCartUI();
                });
            });

            document.querySelectorAll('.inc-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    cart[idx].quantity += 1;
                    bsrDB.saveCart(cart);
                    updateCartUI();
                });
            });

            if (cartSubtotalVal) cartSubtotalVal.textContent = `₹${subtotal}`;
            if (cartTotalElement) cartTotalElement.textContent = `₹${subtotal}`;
        }
    }

    // Call updateCartUI on startup
    updateCartUI();

    // ==========================================================================
    // --- Checkout System & Coupon Logic ---
    // ==========================================================================
    function calculateCheckoutTotals() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05); // 5% GST
        const deliveryFee = (subtotal > 500 || subtotal === 0) ? 0 : 40; // Free delivery over ₹500

        let discount = 0;
        if (appliedCoupon) {
            if (appliedCoupon.rate) {
                discount = Math.round(subtotal * appliedCoupon.rate);
            } else if (appliedCoupon.flat) {
                discount = appliedCoupon.flat;
            }
        }

        const finalTotal = Math.max(0, subtotal + tax + deliveryFee - discount);

        return { subtotal, tax, deliveryFee, discount, finalTotal };
    }

    function renderCheckoutSummary() {
        if (!checkoutItemList) return;
        checkoutItemList.innerHTML = '';

        if (cart.length === 0) {
            checkoutItemList.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem;">No items in cart.</p>';
            return;
        }

        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'checkout-item-row';
            row.innerHTML = `
                <div>
                    <strong>${item.name}</strong> × ${item.quantity}
                </div>
                <strong>₹${item.price * item.quantity}</strong>
            `;
            checkoutItemList.appendChild(row);
        });

        const totals = calculateCheckoutTotals();

        const chkSubtotal = document.getElementById('chk-subtotal');
        const chkTax = document.getElementById('chk-tax');
        const chkDelivery = document.getElementById('chk-delivery');
        const chkDiscount = document.getElementById('chk-discount');
        const discountContainer = document.getElementById('discount-container');
        const chkFinalTotal = document.getElementById('chk-final-total');

        if (chkSubtotal) chkSubtotal.textContent = `₹${totals.subtotal}`;
        if (chkTax) chkTax.textContent = `₹${totals.tax}`;
        if (chkDelivery) chkDelivery.textContent = totals.deliveryFee === 0 ? 'FREE' : `₹${totals.deliveryFee}`;

        if (totals.discount > 0) {
            if (chkDiscount) chkDiscount.textContent = `-₹${totals.discount}`;
            if (discountContainer) discountContainer.classList.remove('hidden');
        } else {
            if (discountContainer) discountContainer.classList.add('hidden');
        }

        if (chkFinalTotal) chkFinalTotal.textContent = `₹${totals.finalTotal}`;
    }

    function openCheckoutModal() {
        if (cart.length === 0) {
            showToast('Your cart is empty! Add dishes to checkout.');
            return;
        }

        toggleCartDrawer(false);

        // Pre-fill customer details from database if available
        const savedCustomer = bsrDB.getCustomerInfo();
        if (savedCustomer.name) document.getElementById('chk-name').value = savedCustomer.name;
        if (savedCustomer.phone) document.getElementById('chk-phone').value = savedCustomer.phone;
        if (savedCustomer.email) document.getElementById('chk-email').value = savedCustomer.email;
        if (savedCustomer.address) document.getElementById('chk-address').value = savedCustomer.address;

        renderCheckoutSummary();
        checkoutModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (lenis) lenis.stop();
    }

    function closeCheckoutModal() {
        if (checkoutModal) {
            checkoutModal.classList.remove('active');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }
    }

    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckoutModal);
    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckoutModal);

    if (checkoutModal) {
        checkoutModal.addEventListener('click', (e) => {
            if (e.target === checkoutModal) {
                closeCheckoutModal();
            }
        });
    }

    // Coupon Apply Action
    if (applyCouponBtn && couponInput) {
        applyCouponBtn.addEventListener('click', () => {
            const code = couponInput.value.trim().toUpperCase();
            if (!code) {
                couponMessage.textContent = 'Please enter a coupon code.';
                couponMessage.className = 'coupon-msg error';
                return;
            }

            if (code === 'BENGAL10') {
                appliedCoupon = { code: 'BENGAL10', rate: 0.10 };
                couponMessage.textContent = 'Coupon BENGAL10 Applied! (10% OFF)';
                couponMessage.className = 'coupon-msg success';
            } else if (code === 'SHOKHER20') {
                appliedCoupon = { code: 'SHOKHER20', rate: 0.20 };
                couponMessage.textContent = 'Coupon SHOKHER20 Applied! (20% OFF)';
                couponMessage.className = 'coupon-msg success';
            } else if (code === 'WELCOME50') {
                appliedCoupon = { code: 'WELCOME50', flat: 50 };
                couponMessage.textContent = 'Coupon WELCOME50 Applied! (₹50 OFF)';
                couponMessage.className = 'coupon-msg success';
            } else {
                couponMessage.textContent = 'Invalid Coupon Code! Try BENGAL10 or SHOKHER20.';
                couponMessage.className = 'coupon-msg error';
                appliedCoupon = null;
            }

            couponMessage.classList.remove('hidden');
            renderCheckoutSummary();
        });
    }

    // Checkout Form Submit -> Save Order to FastAPI Backend Database & Display Receipt
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('chk-name').value.trim();
            const phone = document.getElementById('chk-phone').value.trim();
            const email = document.getElementById('chk-email').value.trim();
            const address = document.getElementById('chk-address').value.trim();

            const orderTypeEl = document.querySelector('input[name="order-type"]:checked');
            const orderType = orderTypeEl ? orderTypeEl.value : 'Delivery';

            const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
            const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'UPI';

            const totals = calculateCheckoutTotals();

            const outletSelectEl = document.getElementById('chk-outlet-id') || document.getElementById('p-outlet-id');
            const selectedOutletId = outletSelectEl ? outletSelectEl.value : 'OUTLET-01';

            const orderPayload = {
                customer_name: name,
                customer_phone: phone,
                order_type: orderType === 'Delivery' ? 'Delivery' : (orderType === 'Dine-In' ? 'Dine-In' : 'Takeaway'),
                delivery_address: address || null,
                table_number: orderType === 'Dine-In' ? address : null,
                items: cart.map(item => ({
                    id: String(item.id),
                    name: item.name,
                    price: item.price,
                    qty: item.quantity
                })),
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
                outlet_id: selectedOutletId
            };

            let createdOrder = null;
            try {
                const apiRes = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload)
                });
                if (apiRes.ok) {
                    const serverOrder = await apiRes.json();
                    createdOrder = {
                        id: serverOrder.id,
                        date: new Date(serverOrder.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                        customerName: serverOrder.customer_name,
                        phone: serverOrder.customer_phone,
                        email: email,
                        orderType: serverOrder.order_type,
                        address: serverOrder.delivery_address || serverOrder.table_number || 'N/A',
                        paymentMethod: paymentMethod,
                        items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                        subtotal: serverOrder.subtotal,
                        tax: totals.tax,
                        deliveryFee: totals.deliveryFee,
                        discount: serverOrder.discount,
                        finalTotal: serverOrder.total,
                        status: serverOrder.status
                    };
                }
            } catch (err) {
                console.error("Backend order submission error:", err);
            }

            if (!createdOrder) {
                // Fallback client order object if server offline
                createdOrder = {
                    id: `BSR-${Math.floor(100000 + Math.random() * 900000)}`,
                    date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                    customerName: name,
                    phone: phone,
                    email: email,
                    orderType: orderType,
                    address: address,
                    paymentMethod: paymentMethod,
                    items: JSON.parse(JSON.stringify(cart)),
                    subtotal: totals.subtotal,
                    tax: totals.tax,
                    deliveryFee: totals.deliveryFee,
                    discount: totals.discount,
                    finalTotal: totals.finalTotal,
                    status: 'Confirmed'
                };
            }

            // Save to Local Database cache
            bsrDB.saveOrder(createdOrder);
            bsrDB.saveCustomerInfo({ name, phone, email, address });

            // Clear Cart
            cart = [];
            bsrDB.saveCart(cart);
            updateCartUI();

            // Hide Checkout Modal
            closeCheckoutModal();

            // Render & Open Receipt Modal
            renderReceipt(createdOrder);
            if (receiptModal) {
                receiptModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                if (lenis) lenis.stop();
            }

            showToast(`🎉 Your order ${createdOrder.id} has been confirmed!`);
        });
    }

    // Render Digital Receipt
    function renderReceipt(order) {
        if (!receiptDetails) return;

        let itemsHtml = order.items.map(item => `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0;">
                <span>${item.name} × ${item.quantity}</span>
                <strong>₹${item.price * item.quantity}</strong>
            </div>
        `).join('');

        receiptDetails.innerHTML = `
            <div style="border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>Order ID: ${order.id}</strong>
                    <span style="color: var(--color-text-muted); font-size: 0.8rem;">${order.date}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">
                    Customer: <strong>${order.customerName}</strong> (${order.phone})<br>
                    ${order.orderType}: ${order.address}
                </div>
            </div>

            <div style="margin: 10px 0;">
                ${itemsHtml}
            </div>

            <div style="border-top: 1px dashed var(--color-border-subtle); padding-top: 10px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; color: var(--color-text-muted);">
                    <span>Subtotal:</span>
                    <span>₹${order.subtotal}</span>
                </div>
                ${order.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: #16a34a;"><span>Discount:</span><span>-₹${order.discount}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between; color: var(--color-text-muted);">
                    <span>Taxes & Delivery:</span>
                    <span>₹${order.tax + order.deliveryFee}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.05rem; margin-top: 4px; color: var(--color-primary);">
                    <span>Total Paid (${order.paymentMethod}):</span>
                    <span style="color: var(--color-secondary);">₹${order.finalTotal}</span>
                </div>
            </div>
        `;
    }

    function closeReceiptModal() {
        if (receiptModal) {
            receiptModal.classList.remove('active');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }
    }

    if (closeReceiptBtn) closeReceiptBtn.addEventListener('click', closeReceiptModal);
    if (receiptModal) {
        receiptModal.addEventListener('click', (e) => {
            if (e.target === receiptModal) closeReceiptModal();
        });
    }

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (viewOrdersBtn) {
        viewOrdersBtn.addEventListener('click', () => {
            closeReceiptModal();
            openHistoryModal();
        });
    }

    // ==========================================================================
    // --- Order History Database Viewer ---
    // ==========================================================================
    function openHistoryModal() {
        const orders = bsrDB.getOrders();
        if (!historyList) return;

        historyList.innerHTML = '';

        if (orders.length === 0) {
            historyList.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: var(--color-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">history</span>
                    <p style="margin-top: 8px;">No past orders found in your history.</p>
                </div>
            `;
        } else {
            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'history-card';

                const itemsSummary = order.items.map(i => `${i.name} (${i.quantity})`).join(', ');

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 0.95rem; color: var(--color-primary);">${order.id}</strong>
                            <span class="status-badge" style="margin-left: 8px;">${order.status}</span>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--color-text-muted);">${order.date}</span>
                    </div>

                    <div style="font-size: 0.85rem; color: var(--color-text-muted);">
                        <strong>Items:</strong> ${itemsSummary}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--color-border-subtle); padding-top: 8px; margin-top: 4px;">
                        <div>
                            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Payment: ${order.paymentMethod}</span>
                            <div style="font-weight: 700; font-size: 1.05rem; color: var(--color-secondary);">Total: ₹${order.finalTotal}</div>
                        </div>
                        <button class="btn btn-outline reorder-btn" data-id="${order.id}" style="padding: 6px 14px; font-size: 0.75rem;">
                            Reorder All
                        </button>
                    </div>
                `;
                historyList.appendChild(card);
            });

            // Reorder button logic
            document.querySelectorAll('.reorder-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const orderId = btn.dataset.id;
                    const orderToReorder = orders.find(o => o.id === orderId);
                    if (orderToReorder) {
                        orderToReorder.items.forEach(item => {
                            const existing = cart.find(c => c.name === item.name);
                            if (existing) {
                                existing.quantity += item.quantity;
                            } else {
                                cart.push({ ...item });
                            }
                        });
                        bsrDB.saveCart(cart);
                        updateCartUI();
                        historyModal.classList.remove('active');
                        toggleCartDrawer(true);
                        showToast(`Reordered items from ${orderId}!`);
                    }
                });
            });
        }

        historyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (lenis) lenis.stop();
    }

    if (ordersHistoryBtn) ordersHistoryBtn.addEventListener('click', openHistoryModal);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => {
        historyModal.classList.remove('active');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
    });

    // --- Category Filters for Dishes ---
    const filterBtns = document.querySelectorAll('.menu-filter');
    const dishCards = document.querySelectorAll('.dish-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;
            dishCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- Dynamic Curated Menu Section Background Hover (Desktop Only with 20ms Delay) ---
    const menuSection = document.getElementById('menu');
    const menuBgBackdrop = document.getElementById('menuBgBackdrop');
    const dishesContainerEl = document.getElementById('dishes-container');

    if (menuSection && menuBgBackdrop && dishesContainerEl && dishCards.length > 0) {
        let isDesktop = window.innerWidth > 768;
        let hoverTimer = null;

        window.addEventListener('resize', debounce(() => {
            isDesktop = window.innerWidth > 768;
            if (!isDesktop) {
                clearTimeout(hoverTimer);
                menuBgBackdrop.classList.remove('active');
                menuSection.classList.remove('has-active-hover');
            }
        }, 300));

        dishCards.forEach(card => {
            const img = card.querySelector('.dish-img-wrap img');
            if (!img) return;

            card.addEventListener('mouseenter', () => {
                if (!isDesktop) return;
                // Clear any pending timer from fast mouse movement
                clearTimeout(hoverTimer);

                // Wait 20ms before activating background transition
                hoverTimer = setTimeout(() => {
                    menuBgBackdrop.style.backgroundImage = `url('${img.src}')`;
                    menuBgBackdrop.classList.add('active');
                    menuSection.classList.add('has-active-hover');
                }, 20);
            });

            card.addEventListener('mouseleave', () => {
                // Cancel activation if cursor leaves card before 20ms
                clearTimeout(hoverTimer);
            });
        });

        // When mouse exits the entire area of cards on desktop, reset to default solid color
        dishesContainerEl.addEventListener('mouseleave', () => {
            if (!isDesktop) return;
            clearTimeout(hoverTimer);
            menuBgBackdrop.classList.remove('active');
            menuSection.classList.remove('has-active-hover');
        });
    }

    // --- Toast Notification ---
    function showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }


    // --- Our Story Section Organic Fluid Wave (Free-Flowing & Constantly Moving) ---
    const heritageSection = document.getElementById('heritage');
    const storyWavePath = document.getElementById('storyWavePath');
    let storyWaveTime = 0;
    let waveFillProgress = 0;
    let waveFilling = false;

    let _storyFrameCounter = 0;
    function getFluidWavePathData(progress, t) {
        const numPoints = 60;
        const width = 1440;
        const targetH = 600 * progress;

        const points = [];
        // Extended boundary sampling (-1 to numPoints + 1) for seamless edge tangents at x=0 and x=1440
        for (let i = -1; i <= numPoints + 1; i++) {
            const normX = i / numPoints;
            const x = normX * width;

            // Overlapping harmonic fluid waves
            const wave1 = Math.sin(normX * Math.PI * 4 + t * 1.6) * 16;
            const wave2 = Math.cos(normX * Math.PI * 3 - t * 1.1) * 12;
            const wave3 = Math.sin(normX * Math.PI * 6 + t * 2.0) * 8;

            // Dynamic swell curve centered in transition
            const swell = Math.sin(progress * Math.PI) * (36 * Math.sin(normX * Math.PI + t * 0.8));

            let y = targetH + swell + wave1 + wave2 + wave3;
            if (progress >= 1.0) {
                y = Math.max(600, 600 + wave1 * 0.2);
            } else if (progress <= 0) {
                y = Math.min(0, wave1 * 0.2);
            }

            points.push({ x, y });
        }

        // Start path at top-left (0,0) and line down to start of curve at x=0
        const pt0 = points[1]; // points[1] corresponds to i=0 (x=0)
        let pathStr = `M 0,0 L 0,${pt0.y.toFixed(1)} `;

        // Continuous C1 Quadratic Bezier spline interpolation through x=1440
        for (let i = 1; i <= numPoints; i++) {
            const cpX = points[i].x;
            const cpY = points[i].y;
            const nextPt = points[i + 1];
            const midX = (cpX + nextPt.x) / 2;
            const midY = (cpY + nextPt.y) / 2;
            pathStr += `Q ${cpX.toFixed(1)},${cpY.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)} `;
        }

        // Close path to top-right corner
        pathStr += `L 1440,0 Z`;
        return pathStr;
    }

    let isStoryVisible = false;
    let storyRafId = null;

    function animateStoryWaveFill() {
        if (!heritageSection || !storyWavePath || !isStoryVisible) {
            storyRafId = null;
            return;
        }

        _storyFrameCounter++;

        // Smooth automatic wave fill progression (30% faster on mobile & desktop)
        if (waveFilling && waveFillProgress < 1.0) {
            waveFillProgress += IS_MOBILE ? 0.0052 : 0.01092;
            if (waveFillProgress >= 1.0) {
                waveFillProgress = 1.0;
            }
        }

        // Time progression for free-flowing organic motion (30% faster on mobile & desktop)
        storyWaveTime += IS_MOBILE ? 0.0078 : 0.0182;

        // Generate fluid wave path
        const pathData = getFluidWavePathData(waveFillProgress, storyWaveTime);
        storyWavePath.setAttribute('d', pathData);

        // Update CSS custom property --wave-fill continuously in sync with wave fill progression
        heritageSection.style.setProperty('--wave-fill', waveFillProgress.toFixed(3));

        // Toggle wave-active text contrast when wave fills section (> 20%)
        if (waveFillProgress > 0.20) {
            heritageSection.classList.add('wave-active');
        } else {
            heritageSection.classList.remove('wave-active');
        }

        storyRafId = requestAnimationFrame(animateStoryWaveFill);
    }

    if (heritageSection && storyWavePath) {
        const storyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isStoryVisible = entry.isIntersecting;
                if (isStoryVisible) {
                    waveFilling = true;
                    if (!storyRafId) storyRafId = requestAnimationFrame(animateStoryWaveFill);
                } else {
                    waveFilling = false;
                    waveFillProgress = 0;
                    heritageSection.style.setProperty('--wave-fill', '0');
                    heritageSection.classList.remove('wave-active');
                    if (storyRafId) {
                        cancelAnimationFrame(storyRafId);
                        storyRafId = null;
                    }
                }
            });
        }, { threshold: 0.10 });

        storyObserver.observe(heritageSection);
    }


    // --- Button Click Reaction (Ripple Effect) ---
    document.querySelectorAll('.btn, .add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function (e) {
            const circle = document.createElement('span');
            const diameter = Math.max(this.clientWidth, this.clientHeight);
            const radius = diameter / 2;
            const rect = this.getBoundingClientRect();

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.classList.add('ripple-effect');

            const existingRipple = this.querySelector('.ripple-effect');
            if (existingRipple) existingRipple.remove();

            this.appendChild(circle);
            setTimeout(() => circle.remove(), 600);
        });
    });

    // --- Dynamic Payment & Order Type Radio Selection Highlights ---
    function updateRadioCardHighlights() {
        document.querySelectorAll('.payment-card, .radio-card').forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    document.addEventListener('change', (e) => {
        if (e.target && e.target.type === 'radio') {
            updateRadioCardHighlights();
        }
    });

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.payment-card, .radio-card');
        if (card) {
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                updateRadioCardHighlights();
            }
        }
    });

    // Run initial update on page load
    updateRadioCardHighlights();

    // --- Custom Cursor & Scroll Capsule Morphing ---
    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('custom-cursor-follower');
    let scrollTimeout;

    // Custom cursor: only attach events on desktop – no listeners consumed on mobile
    if (cursor && !IS_MOBILE) {
        // Ensure cursor elements are top-level direct children of document.body (above modal overlays)
        if (cursor.parentNode !== document.body) {
            document.body.appendChild(cursor);
        }
        if (follower && follower.parentNode !== document.body) {
            document.body.appendChild(follower);
        }

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;

            if (e.target && e.target.closest && e.target.closest('#hero')) {
                cursor.classList.add('hero-hide');
            } else {
                cursor.classList.remove('hero-hide');
            }
        }, { capture: true, passive: true });

        window.addEventListener('scroll', throttle(() => {
            cursor.classList.add('scrolling');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                cursor.classList.remove('scrolling');
            }, 300);
        }, 100), { passive: true });

        // Magnifying glass expansion when hovering focused elements
        const focusableSelector = 'a, button, .dish-card, input, select, .brand-logo, .hero-image-card, .menu-filter, .feature-card, .admin-btn, .admin-nav-item, .admin-card, .role-badge, .admin-modal-card, .theme-switcher-btn, .admin-logout-btn, .modal-overlay, .admin-modal-overlay, .modal-card';
        document.addEventListener('mouseover', (e) => {
            if (e.target && e.target.closest && e.target.closest(focusableSelector)) {
                cursor.classList.add('magnify');
            }
        }, { capture: true, passive: true });

        document.addEventListener('mouseout', (e) => {
            if (e.target && e.target.closest && e.target.closest(focusableSelector)) {
                cursor.classList.remove('magnify');
            }
        }, { capture: true, passive: true });
    }

    // ═══════════════════════════════════════════════════════════
    // HERO – BLOB DETACHES & GROWS (FROM HERO.HTML)
    // ═══════════════════════════════════════════════════════════
    (function heroAnimation() {
        const hero = document.getElementById('hero');
        if (!hero) return;

        const revealLayer = document.getElementById('revealLayer');
        const cloneLayer = document.getElementById('cloneLayer');
        const cloneImg = document.getElementById('cloneImg');
        const heroBgSolid = document.getElementById('heroBgSolid');
        const images = document.querySelectorAll('#revealLayer .reveal-img');
        const blobBorder = document.getElementById('blobBorder');
        const heroText = document.getElementById('heroText');
        const navbar = document.querySelector('.site-header') || document.getElementById('navbar');

        if (!revealLayer || !cloneLayer || !cloneImg || !heroBgSolid || !images.length || !blobBorder || !heroText) return;

        // ── State ──
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let currentX = mouseX;
        let currentY = mouseY;
        let currentRadius = 150;
        let time = 0;

        let lastMoveTime = Date.now();
        let spotlightGrowth = 1;

        // Frame Delta Time Tracking
        let lastFrameTime = performance.now();
        let cycleAccumulator = 0;

        // Tracking Initial Setup
        let bgIndex = 0;
        let spotIndex = 1;

        heroBgSolid.style.backgroundImage = images[bgIndex].style.backgroundImage;
        images.forEach(img => img.classList.remove('active'));
        images[spotIndex].classList.add('active');

        // Expanding Wave State
        let wave = {
            active: false,
            x: 0,
            y: 0,
            startR: 0,
            currentR: 0,
            maxR: 0,
            progress: 0
        };

        // ── Preload ──
        images.forEach((img) => {
            const bg = getComputedStyle(img).backgroundImage;
            const url = bg.slice(5, -2);
            if (url) {
                const preloader = new Image();
                preloader.src = url;
            }
        });

        // Cache viewport dimensions, mobile flag, and scroll Y outside rAF to prevent layout thrash
        let cachedVw = window.innerWidth;
        let cachedVh = window.innerHeight;
        let cachedIsMobile = cachedVw <= 768;
        let cachedScrollY = window.scrollY;

        window.addEventListener('resize', debounce(() => {
            cachedVw = window.innerWidth;
            cachedVh = window.innerHeight;
            cachedIsMobile = cachedVw <= 768;
        }, 200));

        window.addEventListener('scroll', () => {
            cachedScrollY = window.scrollY;
        }, { passive: true });

        // ── Mouse & Touch tracking ──
        function updatePointer(clientX, clientY) {
            const rect = hero.getBoundingClientRect();
            mouseX = clientX - rect.left;
            mouseY = clientY - rect.top;
            lastMoveTime = Date.now();
        }

        hero.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY));
        hero.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                updatePointer(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
        hero.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                updatePointer(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        // ── Spotlight Base Radius Math ──
        function calcRadius(cx, cy, vw, vh) {
            if (cachedIsMobile) {
                return Math.min(vw, vh) * 0.19;
            }
            const dist = Math.sqrt(cx * cx + cy * cy);
            const maxDist = Math.sqrt(vw * vw + vh * vh);
            const normalized = Math.min(dist / maxDist, 1);
            const minR = 40;
            const maxR = 0.45 * Math.min(vw, vh);
            const t = Math.pow(normalized, 0.85);
            return minR + t * (maxR - minR);
        }

        // ── Fluid Polygon Math (Desktop Blob) ──
        let _heroFrameCounter = 0;
        function getBlobPath(cx, cy, r, t) {
            const numPoints = cachedIsMobile ? 20 : 120;
            let d = "";
            const varianceMult = cachedIsMobile ? 0.05 : 0.09;
            const timeSpeed = cachedIsMobile ? 0.6 : 1.0;
            const TWO_PI = Math.PI * 2;

            for (let i = 0; i <= numPoints; i++) {
                let theta = (i / numPoints) * TWO_PI;

                let radiusVariance = r * varianceMult;
                let wave1 = Math.sin(theta * 4 + t * 1.2 * timeSpeed) * radiusVariance;
                let wave2 = Math.cos(theta * 3 - t * 0.8 * timeSpeed) * (radiusVariance * 0.7);
                let wave3 = Math.sin(theta * 6 + t * 1.5 * timeSpeed) * (radiusVariance * 0.5);

                let currentR = r + wave1 + wave2 + wave3;

                let x = cx + currentR * Math.cos(theta);
                let y = cy + currentR * Math.sin(theta);

                if (i === 0) {
                    d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
                } else {
                    d += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
                }
            }
            d += "Z";
            return d;
        }

        // ── Cycle Trigger ──
        function cycleImage() {
            if (wave.active) return false;

            let expandingIndex = spotIndex;
            bgIndex = spotIndex;
            const maxImages = cachedIsMobile ? 3 : images.length;
            spotIndex = (spotIndex + 1) % maxImages;

            cloneImg.style.backgroundImage = images[expandingIndex].style.backgroundImage;
            if (!cachedIsMobile) {
                // Setup Clone Layer over current spotlight geometry on desktop
                let initialPath = getBlobPath(currentX, currentY, Math.max(1, currentRadius), time);
                cloneLayer.style.clipPath = `path("${initialPath}")`;
                cloneLayer.style.webkitClipPath = `path("${initialPath}")`;
                cloneLayer.style.opacity = '1';
            } else {
                // Setup Clone Layer using GPU primitive circle on mobile
                let initialCircle = `circle(${Math.round(Math.max(1, currentRadius))}px at ${Math.round(currentX)}px ${Math.round(currentY)}px)`;
                cloneLayer.style.clipPath = initialCircle;
                cloneLayer.style.webkitClipPath = initialCircle;
                cloneLayer.style.opacity = '1';
            }

            // Update Spotlight to NEXT image & Background to the EXPANDING image
            images[expandingIndex].classList.remove('active');
            images[spotIndex].classList.add('active');
            heroBgSolid.style.backgroundImage = images[bgIndex].style.backgroundImage;

            wave.active = true;
            wave.progress = 0;
            wave.x = currentX;
            wave.y = currentY;
            wave.startR = currentRadius;
            wave.maxR = Math.sqrt(cachedVw ** 2 + cachedVh ** 2) * 1.2;

            // RESET current tracking spotlight to scale 0 so it grows back seamlessly
            currentRadius = 0;
            spotlightGrowth = 0;

            return true;
        }

        let isHeroVisible = true;
        let heroRafId = null;

        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isHeroVisible = entry.isIntersecting;
                if (isHeroVisible && !heroRafId) {
                    lastFrameTime = performance.now();
                    heroRafId = requestAnimationFrame(animate);
                } else if (!isHeroVisible && heroRafId) {
                    cancelAnimationFrame(heroRafId);
                    heroRafId = null;
                }
            });
        }, { threshold: 0.05 });

        heroObserver.observe(hero);

        // ── Animation Loop (Frame Rate Independent & Viewport Throttled) ──
        const _HERO_FPS_INTERVAL = IS_MOBILE ? 33 : 16; // 30fps on mobile, 60fps on desktop
        function animate(currentTime) {
            if (!isHeroVisible) {
                heroRafId = null;
                return;
            }

            if (!currentTime) currentTime = performance.now();
            let deltaTime = currentTime - lastFrameTime;

            // Throttle to target FPS on mobile to reduce CPU load
            if (deltaTime < _HERO_FPS_INTERVAL) {
                heroRafId = requestAnimationFrame(animate);
                return;
            }

            if (deltaTime > 50) deltaTime = 16;
            lastFrameTime = currentTime;
            _heroFrameCounter++;

            const mobile = cachedIsMobile;
            const vw = cachedVw;
            const vh = cachedVh;

            // Fast & responsive time progression
            time += ((mobile ? 0.0025 : 0.004) * deltaTime);

            // Target coordinates: centered by default on mobile if untouched
            const targetX = mobile ? (lastMoveTime && (Date.now() - lastMoveTime < 3000) ? mouseX : vw * 0.5) : mouseX;
            const targetY = mobile ? (lastMoveTime && (Date.now() - lastMoveTime < 3000) ? mouseY : vh * 0.42) : mouseY;

            // Highly responsive lerp (0.35 on mobile vs 0.55 on desktop)
            const lerpSpeed = mobile ? 0.35 : 0.55;
            currentX += (targetX - currentX) * lerpSpeed;
            currentY += (targetY - currentY) * lerpSpeed;

            // Scroll Disappear Logic (using cached scrollY)
            let shrinkFactor = Math.max(0, 1 - (cachedScrollY / (vh * 0.6)));

            heroText.style.opacity = Math.max(0.2, shrinkFactor);

            // Cycle interval: 3800ms on mobile vs 2800ms desktop
            const cycleInterval = mobile ? 3800 : 2800;
            cycleAccumulator += deltaTime;
            if (cycleAccumulator >= cycleInterval) {
                if (cycleImage()) {
                    cycleAccumulator = 0;
                }
            }

            // Snappy spotlight growth rate: 600ms on mobile vs 400ms desktop
            const growthTime = mobile ? 600 : 400;
            if (spotlightGrowth < 1) {
                spotlightGrowth += (deltaTime / growthTime);
                if (spotlightGrowth > 1) spotlightGrowth = 1;
            }

            // Cubic ease-out curve for responsive blob regrowth
            let growthEase = 1 - Math.pow(1 - spotlightGrowth, 3);
            const baseR = calcRadius(currentX, currentY, vw, vh);
            // Lightweight sine-wave edge pulse on mobile (+/- 4%) without SVG polygon parsing
            const mobilePulse = mobile ? Math.sin(time * 2.5) * (baseR * 0.04) : 0;
            const targetR = (baseR + mobilePulse) * Math.max(0.3, shrinkFactor) * growthEase;

            const radiusLerp = mobile ? 0.45 : 0.6;
            currentRadius += (targetR - currentRadius) * radiusLerp;

            if (currentRadius > 1) {
                let pathCss;
                if (mobile) {
                    // GPU-composited primitive circle clip-path on mobile (Zero repaint overhead)
                    pathCss = `circle(${Math.round(currentRadius)}px at ${Math.round(currentX)}px ${Math.round(currentY)}px)`;
                } else {
                    const spotlightPath = getBlobPath(currentX, currentY, currentRadius, time);
                    pathCss = `path("${spotlightPath}")`;
                }

                revealLayer.style.clipPath = pathCss;
                revealLayer.style.webkitClipPath = pathCss;
                revealLayer.style.opacity = '1';
            } else {
                revealLayer.style.opacity = '0';
            }

            // Wave Expansion (GPU Circle on Mobile, SVG Blob on Desktop)
            if (wave.active) {
                const waveDuration = mobile ? 2200 : 2700;
                wave.progress += (deltaTime / waveDuration);

                if (wave.progress >= 1) {
                    wave.active = false;
                    cloneLayer.style.opacity = '0';
                    blobBorder.style.stroke = "rgba(255, 255, 255, 0)";
                } else {
                    let t = wave.progress;
                    let easeOut = 1 - Math.pow(1 - t, 3);
                    wave.currentR = wave.startR + easeOut * (wave.maxR - wave.startR);

                    if (mobile) {
                        const pathCss = `circle(${Math.round(wave.currentR)}px at ${Math.round(wave.x)}px ${Math.round(wave.y)}px)`;
                        cloneLayer.style.clipPath = pathCss;
                        cloneLayer.style.webkitClipPath = pathCss;
                        cloneLayer.style.opacity = (1 - easeOut).toString();
                    } else {
                        let blobPathStr = getBlobPath(wave.x, wave.y, wave.currentR, time);
                        const pathCss = `path("${blobPathStr}")`;

                        cloneLayer.style.clipPath = pathCss;
                        cloneLayer.style.webkitClipPath = pathCss;
                        cloneLayer.style.opacity = (1 - easeOut).toString();

                        blobBorder.setAttribute('d', blobPathStr);
                        blobBorder.style.stroke = `rgba(255, 255, 255, ${0.8 * (1 - easeOut)})`;
                    }
                }
            }

            if (isHeroVisible) {
                heroRafId = requestAnimationFrame(animate);
            } else {
                heroRafId = null;
            }
        }
        heroRafId = requestAnimationFrame(animate);
    })();

    // ==========================================================================
    // --- Admin Panel Authentication & FastAPI Backend Integration ---
    // ==========================================================================
    const adminLoginScreen = document.getElementById('admin-login-screen');
    const adminDashboardScreen = document.getElementById('admin-dashboard-screen');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginError = document.getElementById('admin-login-error');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminUserDisplay = document.getElementById('admin-user-display');

    const adminSearchInput = document.getElementById('admin-search-input');
    const adminStatusFilter = document.getElementById('admin-status-filter');
    const adminTypeFilter = document.getElementById('admin-type-filter');
    const adminOrdersList = document.getElementById('admin-orders-list');
    const adminRefreshBtn = document.getElementById('admin-refresh-btn');
    const adminClearDbBtn = document.getElementById('admin-clear-db-btn');

    // Debounce admin search to avoid re-rendering on every keystroke
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', debounce(() => renderAdminDashboard(), 300));
    }

    // Security Modals Elements
    const adminAuditBtn = document.getElementById('admin-audit-btn');
    const auditModal = document.getElementById('audit-logs-modal');
    const closeAuditBtn = document.getElementById('close-audit-modal');
    const auditContent = document.getElementById('audit-logs-content');

    const adminChpwBtn = document.getElementById('admin-chpw-btn');
    const chpwModal = document.getElementById('chpw-modal');
    const closeChpwBtn = document.getElementById('close-chpw-modal');
    const chpwForm = document.getElementById('chpw-form');
    const chpwMsg = document.getElementById('chpw-msg');

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    let currentCsrfToken = sessionStorage.getItem('bsr_csrf_token') || '';

    function setCsrfToken(token) {
        if (!token) return;
        currentCsrfToken = token;
        try {
            sessionStorage.setItem('bsr_csrf_token', token);
        } catch (e) {}
    }

    function getCsrfToken() {
        const match = document.cookie.match(new RegExp('(?:^|; )bsr_csrf_token=([^;]+)'));
        if (match && match[1]) return decodeURIComponent(match[1]);
        return currentCsrfToken || sessionStorage.getItem('bsr_csrf_token') || '';
    }

    let currentDbVersion = 0;
    let syncIntervalTimer = null;

    async function checkDbSyncSchedule() {
        if (!adminDashboardScreen || adminDashboardScreen.classList.contains('hidden')) {
            return;
        }

        try {
            const res = await fetch('/api/admin/sync-status', {
                method: 'GET',
                headers: getAuthHeaders(),
                cache: 'no-store'
            });

            if (res.ok) {
                const headerVersionStr = res.headers.get('X-DB-Revision');
                const data = await res.json();
                const serverVersion = headerVersionStr ? parseInt(headerVersionStr, 10) : (data.db_version || 0);

                if (currentDbVersion === 0) {
                    currentDbVersion = serverVersion;
                } else if (serverVersion > currentDbVersion) {
                    currentDbVersion = serverVersion;
                    await renderAdminDashboard();

                    const activeTab = document.querySelector('.admin-nav-btn.active');
                    if (activeTab) {
                        const tabName = activeTab.dataset.tab;
                        if (tabName === 'reservations') await loadInlineReservations();
                        else if (tabName === 'employees') await loadInlineEmployees();
                        else if (tabName === 'audit') await loadInlineAuditLogs();
                    }
                    showToast('⚡ Live Sync: Database updated, dashboard refreshed.');
                }
            }
        } catch (err) {
            // Silently ignore offline network errors
        }
    }

    function startAdminSyncSchedule() {
        if (!syncIntervalTimer) {
            checkDbSyncSchedule();
            syncIntervalTimer = setInterval(checkDbSyncSchedule, 5000);
        }
    }

    function stopAdminSyncSchedule() {
        if (syncIntervalTimer) {
            clearInterval(syncIntervalTimer);
            syncIntervalTimer = null;
        }
    }

    // ==========================================================================
    // --- Admin Inactivity Tracker (1 Hour Auto-Logout) & Session Boundary ---
    // ==========================================================================
    const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour in milliseconds (3,600,000 ms)
    let inactivityTimer = null;
    let lastActivityTimestamp = Date.now();

    function recordAdminActivity() {
        lastActivityTimestamp = Date.now();
        sessionStorage.setItem('bsr_admin_last_activity', String(lastActivityTimestamp));
    }

    const throttledRecordActivity = throttle(recordAdminActivity, 5000);

    function startAdminInactivityTracker() {
        recordAdminActivity();
        
        window.addEventListener('mousemove', throttledRecordActivity, { passive: true });
        window.addEventListener('keydown', throttledRecordActivity, { passive: true });
        window.addEventListener('click', throttledRecordActivity, { passive: true });
        window.addEventListener('scroll', throttledRecordActivity, { passive: true });
        window.addEventListener('touchstart', throttledRecordActivity, { passive: true });

        if (inactivityTimer) clearInterval(inactivityTimer);

        // Periodically check elapsed inactivity time every 15 seconds
        inactivityTimer = setInterval(() => {
            if (!adminDashboardScreen || adminDashboardScreen.classList.contains('hidden')) {
                return;
            }

            const storedLastActivity = parseInt(sessionStorage.getItem('bsr_admin_last_activity') || String(lastActivityTimestamp), 10);
            const elapsed = Date.now() - storedLastActivity;

            if (elapsed >= INACTIVITY_LIMIT_MS) {
                performAdminAutoLogout('Session expired after 1 hour of inactivity.');
            }
        }, 15000);
    }

    function stopAdminInactivityTracker() {
        window.removeEventListener('mousemove', throttledRecordActivity);
        window.removeEventListener('keydown', throttledRecordActivity);
        window.removeEventListener('click', throttledRecordActivity);
        window.removeEventListener('scroll', throttledRecordActivity);
        window.removeEventListener('touchstart', throttledRecordActivity);

        if (inactivityTimer) {
            clearInterval(inactivityTimer);
            inactivityTimer = null;
        }
    }

    async function performAdminAutoLogout(reasonMessage = 'Admin session logged out.') {
        stopAdminInactivityTracker();
        stopAdminSyncSchedule();

        try {
            await fetch('/api/admin/logout', { method: 'POST' });
        } catch (e) {
            // Ignore network disconnects during logout
        }

        sessionStorage.removeItem('bsr_admin_logged_in');
        sessionStorage.removeItem('bsr_admin_access_token');
        sessionStorage.removeItem('bsr_admin_last_activity');
        sessionStorage.removeItem('bsr_csrf_token');
        localStorage.removeItem('bsr_admin_logged_in');
        localStorage.removeItem('bsr_admin_access_token');

        if (adminDashboardScreen) adminDashboardScreen.classList.add('hidden');
        if (adminLoginScreen) adminLoginScreen.classList.remove('hidden');

        if (adminLoginError) {
            adminLoginError.textContent = `🔒 ${reasonMessage}`;
            adminLoginError.classList.remove('hidden');
        }

        showToast(`🔒 ${reasonMessage}`);
    }

    function getAuthHeaders(extraHeaders = {}) {
        const headers = { ...extraHeaders };
        const csrf = getCsrfToken();
        if (csrf) {
            headers['X-CSRF-Token'] = csrf;
        }
        const accessToken = sessionStorage.getItem('bsr_admin_access_token') || localStorage.getItem('bsr_admin_access_token');
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return headers;
    }

    async function checkAdminSession() {
        if (!adminLoginScreen || !adminDashboardScreen) return;

        const isLocalLoggedIn = sessionStorage.getItem('bsr_admin_logged_in') === 'true' || localStorage.getItem('bsr_admin_logged_in') === 'true';

        try {
            const res = await fetch('/api/admin/me', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.csrf_token) setCsrfToken(data.csrf_token);
                window.currentAdminRole = data.role || 'Super Admin';
                window.currentAdminUsername = data.username || 'admin';
                if (adminUserDisplay) adminUserDisplay.textContent = data.username || 'SuperAdmin';
                const adminRoleDisplay = document.getElementById('admin-role-display');
                if (adminRoleDisplay) adminRoleDisplay.textContent = data.role || 'Super Admin';

                // Restrict RBAC tab visibility if not Super Admin or Super Manager
                const tabUsers = document.getElementById('admin-tab-users');
                if (tabUsers) {
                    if (data.role === 'Super Admin' || data.role === 'Super Manager') {
                        tabUsers.classList.remove('hidden');
                    } else {
                        tabUsers.classList.add('hidden');
                    }
                }

                // Restrict Add Staff button and Audit Logs for Staff role
                const openAddEmpModal = document.getElementById('open-add-employee-modal');
                if (openAddEmpModal) {
                    if (data.role === 'Staff') {
                        openAddEmpModal.classList.add('hidden');
                    } else {
                        openAddEmpModal.classList.remove('hidden');
                    }
                }

                const adminAuditBtn = document.getElementById('admin-audit-btn');
                if (adminAuditBtn) {
                    if (data.role === 'Staff') {
                        adminAuditBtn.classList.add('hidden');
                    } else {
                        adminAuditBtn.classList.remove('hidden');
                    }
                }

                sessionStorage.setItem('bsr_admin_logged_in', 'true');
                adminLoginScreen.classList.add('hidden');
                adminDashboardScreen.classList.remove('hidden');
                renderAdminDashboard();
                loadInlineReservations();
                startAdminSyncSchedule();
                startAdminInactivityTracker();
            } else {
                // Session expired or unauthenticated
                if (isLocalLoggedIn) {
                    performAdminAutoLogout('Admin session expired. Please re-login.');
                } else {
                    stopAdminInactivityTracker();
                    stopAdminSyncSchedule();
                    sessionStorage.removeItem('bsr_admin_logged_in');
                    sessionStorage.removeItem('bsr_admin_access_token');
                    sessionStorage.removeItem('bsr_csrf_token');
                    localStorage.removeItem('bsr_admin_logged_in');
                    localStorage.removeItem('bsr_admin_access_token');
                    if (adminDashboardScreen) adminDashboardScreen.classList.add('hidden');
                    if (adminLoginScreen) adminLoginScreen.classList.remove('hidden');
                    if (adminLoginError) adminLoginError.classList.add('hidden');
                }
            }
        } catch (err) {
            // Network fallback mode
            if (isLocalLoggedIn) {
                if (adminUserDisplay) adminUserDisplay.textContent = 'Master Admin';
                adminLoginScreen.classList.add('hidden');
                adminDashboardScreen.classList.remove('hidden');
                renderAdminDashboard();
                loadInlineReservations();
                startAdminSyncSchedule();
                startAdminInactivityTracker();
            } else {
                stopAdminSyncSchedule();
                adminLoginScreen.classList.remove('hidden');
                adminDashboardScreen.classList.add('hidden');
            }
        }
    }

    // Automatically verify admin session on admin page load
    if (adminLoginScreen || adminDashboardScreen) {
        checkAdminSession();
    }


    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('admin-username').value.trim();
            const passwordInput = document.getElementById('admin-password').value.trim();

            if (adminLoginError) adminLoginError.classList.add('hidden');

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.csrf_token) setCsrfToken(data.csrf_token);
                    if (data.access_token) {
                        sessionStorage.setItem('bsr_admin_access_token', data.access_token);
                        localStorage.setItem('bsr_admin_access_token', data.access_token);
                    }
                    sessionStorage.setItem('bsr_admin_logged_in', 'true');
                    showToast('🔒 Authenticated via Secure FastAPI Session!');
                    checkAdminSession();
                } else {
                    const err = await res.json();
                    if (adminLoginError) {
                        adminLoginError.textContent = err.detail || 'Invalid Admin Username or Password!';
                        adminLoginError.classList.remove('hidden');
                    }
                }
            } catch (err) {
                // Fallback for standalone static testing
                if (usernameInput === 'admin' && passwordInput === 'bsr@admin2026') {
                    sessionStorage.setItem('bsr_admin_logged_in', 'true');
                    checkAdminSession();
                    showToast('Welcome to Admin Portal!');
                } else {
                    if (adminLoginError) {
                        adminLoginError.textContent = 'Invalid Admin Username or Password!';
                        adminLoginError.classList.remove('hidden');
                    }
                }
            }
        });
    }

    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async () => {
            await performAdminAutoLogout('Logged out from Admin Portal.');
        });
    }

    async function renderAdminDashboard() {
        if (!adminOrdersList) return;

        let orders = [];

        // Fetch live orders from FastAPI server
        try {
            const searchQuery = adminSearchInput ? adminSearchInput.value.trim() : '';
            const statusFilterVal = adminStatusFilter ? adminStatusFilter.value : 'ALL';
            const typeFilterVal = adminTypeFilter ? adminTypeFilter.value : 'ALL';
            const outletFilterVal = adminOutletFilter ? adminOutletFilter.value : 'ALL';

            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilterVal !== 'ALL') params.append('status_filter', statusFilterVal);
            if (typeFilterVal !== 'ALL') params.append('type_filter', typeFilterVal);
            if (outletFilterVal !== 'ALL') params.append('outlet_filter', outletFilterVal);
            params.append('_t', Date.now());

            const res = await fetch(`/api/admin/orders?${params.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' });
            if (res.ok) {
                const apiOrders = await res.json();
                orders = apiOrders.map(o => ({
                    id: o.id,
                    date: new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                    customerName: o.customer_name,
                    phone: o.customer_phone,
                    orderType: o.order_type,
                    address: o.delivery_address || o.table_number || 'N/A',
                    paymentMethod: 'Prepaid / Verified',
                    items: o.items.map(i => ({ id: i.id, name: i.name, quantity: i.qty, price: i.price })),
                    subtotal: o.subtotal,
                    discount: o.discount,
                    couponCode: o.coupon_code,
                    tax: 0,
                    deliveryFee: 0,
                    finalTotal: o.total,
                    status: o.status,
                    outletId: o.outlet_id || 'OUTLET-01'
                }));
            } else if (res.status === 401) {
                localStorage.removeItem('bsr_admin_logged_in');
                adminLoginScreen.classList.remove('hidden');
                adminDashboardScreen.classList.add('hidden');
                return;
            }
        } catch (err) {
            orders = bsrDB.getOrders();
        }

        // Metrics elements
        const metricTotalOrders = document.getElementById('metric-total-orders');
        const metricTotalRevenue = document.getElementById('metric-total-revenue');
        const metricActiveOrders = document.getElementById('metric-active-orders');
        const metricCompletedOrders = document.getElementById('metric-completed-orders');
        const metricResCount = document.getElementById('metric-reservations-count');
        const filteredCountEl = document.getElementById('admin-filtered-count');

        const totalRevenue = orders.reduce((sum, o) => o.status !== 'Cancelled' ? sum + (o.finalTotal || 0) : sum, 0);
        const activeOrders = orders.filter(o => o.status === 'Confirmed' || o.status === 'Kitchen Prep' || o.status === 'Out for Delivery').length;
        const completedOrders = orders.filter(o => o.status === 'Completed').length;

        if (metricTotalOrders) metricTotalOrders.textContent = orders.length;
        if (metricTotalRevenue) metricTotalRevenue.textContent = `₹${totalRevenue.toLocaleString()}`;
        if (metricActiveOrders) metricActiveOrders.textContent = activeOrders;
        if (metricCompletedOrders) metricCompletedOrders.textContent = completedOrders;
        if (filteredCountEl) filteredCountEl.textContent = orders.length;

        // Fetch bookings & events count asynchronously for 5th KPI card
        try {
            const [r1, r2] = await Promise.all([
                fetch('/api/admin/reservations', { headers: getAuthHeaders(), cache: 'no-store' }),
                fetch('/api/admin/private-events', { headers: getAuthHeaders(), cache: 'no-store' })
            ]);
            const list1 = r1.ok ? await r1.json() : [];
            const list2 = r2.ok ? await r2.json() : [];
            if (metricResCount) metricResCount.textContent = list1.length + list2.length;
        } catch (e) {
            if (metricResCount) metricResCount.textContent = '0';
        }

        adminOrdersList.innerHTML = '';

        if (orders.length === 0) {
            adminOrdersList.innerHTML = `
                <div style="text-align: center; padding: 48px 0; color: var(--color-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 56px; opacity: 0.4;">inbox</span>
                    <p style="margin-top: 8px; font-size: 1rem;">No orders match the selected search & filter criteria.</p>
                </div>
            `;
            return;
        }

        const ordersMap = {};
        // Use DocumentFragment to batch all DOM insertions – prevents layout thrash on each append
        const ordersFragment = document.createDocumentFragment();

        orders.forEach(order => {
            ordersMap[order.id] = order;
            const card = document.createElement('div');
            card.className = 'admin-order-card';

            const itemsHtml = (order.items || []).map(i => `
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>${i.name} × <strong>${i.quantity}</strong></span>
                    <span>₹${i.price * i.quantity}</span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="admin-order-header">
                    <div>
                        <strong style="font-size: 1.1rem; color: var(--color-primary); cursor: pointer;" class="admin-inspect-trigger" data-id="${order.id}">${order.id}</strong>
                        <span style="font-size: 0.75rem; font-weight: 700; background-color: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 4px; color: var(--color-primary); margin-left: 8px;">📍 ${order.outletId}</span>
                        <span style="font-size: 0.8rem; color: var(--color-text-muted); margin-left: 10px;">Placed: ${order.date}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-secondary);">${order.orderType}</span>
                        <select class="status-select admin-status-change" data-id="${order.id}">
                            <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="Kitchen Prep" ${order.status === 'Kitchen Prep' ? 'selected' : ''}>Kitchen Prep</option>
                            <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </div>

                <div class="admin-order-body">
                    <div>
                        <strong style="color: var(--color-primary); font-size: 0.9rem;">Customer Details</strong>
                        <div style="margin-top: 6px; color: var(--color-text-muted);">
                            <strong>${order.customerName}</strong><br>
                            📞 Phone: ${order.phone}<br>
                            📍 Address/Table: <strong>${order.address}</strong>
                        </div>
                    </div>

                    <div>
                        <strong style="color: var(--color-primary); font-size: 0.9rem;">Ordered Dishes (${order.items.length})</strong>
                        <div style="margin-top: 6px;">
                            ${itemsHtml}
                        </div>
                    </div>

                    <div style="background-color: var(--color-surface-soft); padding: 12px; border-radius: 8px;">
                        <strong style="color: var(--color-primary); font-size: 0.9rem;">Bill Calculation</strong>
                        <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px; color: var(--color-text-muted);">
                            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${order.subtotal}</span></div>
                            ${order.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: #16a34a;"><span>Discount:</span><span>-₹${order.discount}</span></div>` : ''}
                            <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--color-primary); margin-top: 4px; font-size: 1.05rem;">
                                <span>Total Paid:</span>
                                <span style="color: var(--color-secondary);">₹${order.finalTotal}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="admin-order-footer">
                    <span style="font-size: 0.8rem; color: var(--color-text-muted);">SQLite Record ID: ${order.id}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary admin-inspect-btn" data-id="${order.id}" style="padding: 4px 12px; font-size: 0.75rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span> Inspect Details
                        </button>
                        <button class="btn btn-outline admin-print-btn" data-id="${order.id}" style="padding: 4px 12px; font-size: 0.75rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">print</span> Print Invoice
                        </button>
                        <button class="btn btn-outline admin-delete-btn" data-id="${order.id}" style="padding: 4px 12px; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span> Delete Order
                        </button>
                    </div>
                </div>
            `;

            ordersFragment.appendChild(card);
        });

        // Single DOM write: append all cards at once
        adminOrdersList.appendChild(ordersFragment);

        // Add Inspect Details Event Listeners
        document.querySelectorAll('.admin-inspect-btn, .admin-inspect-trigger').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                if (ordersMap[id]) {
                    openOrderDetailsModal(ordersMap[id]);
                }
            });
        });

        // Add Status Change Event Listeners
        document.querySelectorAll('.admin-status-change').forEach(select => {
            select.addEventListener('change', async () => {
                const orderId = select.dataset.id;
                const newStatus = select.value;
                try {
                    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                        method: 'PATCH',
                        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ status: newStatus })
                    });
                    if (res.ok) {
                        showToast(`Order ${orderId} status set to ${newStatus}`);
                        renderAdminDashboard();
                    } else {
                        const err = await res.json();
                        showToast(err.detail || 'Failed to update order status');
                    }
                } catch (e) {
                    showToast(`Order ${orderId} status set to ${newStatus}`);
                }
            });
        });

        // Add Delete Event Listeners with 2-Step Confirmation
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = btn.dataset.id;
                if (confirmDoubleDelete(`Order ID ${orderId}`)) {
                    try {
                        const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE', headers: getAuthHeaders() });
                        if (res.ok) {
                            bsrDB.deleteOrder(orderId);
                            showToast(`Order ${orderId} deleted from database.`);
                            await renderAdminDashboard();
                        } else {
                            const err = await res.json();
                            showToast(err.detail || 'Delete failed');
                        }
                    } catch (e) {
                        bsrDB.deleteOrder(orderId);
                        showToast(`Order ${orderId} deleted.`);
                        await renderAdminDashboard();
                    }
                }
            });
        });

        // Add Print Event Listeners
        document.querySelectorAll('.admin-print-btn').forEach(btn => {
            btn.addEventListener('click', () => window.print());
        });
    }

    const adminOutletFilter = document.getElementById('admin-outlet-filter');

    if (adminSearchInput) adminSearchInput.addEventListener('input', () => {
        renderAdminDashboard();
        loadInlineReservations();
    });
    if (adminOutletFilter) adminOutletFilter.addEventListener('change', () => {
        renderAdminDashboard();
        loadInlineReservations();
        loadInlineEmployees();
    });
    if (adminStatusFilter) adminStatusFilter.addEventListener('change', renderAdminDashboard);
    if (adminTypeFilter) adminTypeFilter.addEventListener('change', renderAdminDashboard);
    if (adminRefreshBtn) adminRefreshBtn.addEventListener('click', () => {
        renderAdminDashboard();
        loadInlineReservations();
        showToast('Database refreshed!');
    });

    if (adminClearDbBtn) {
        adminClearDbBtn.addEventListener('click', async () => {
            if (confirmDoubleDelete('ALL food orders in the entire database')) {
                try {
                    const res = await fetch('/api/admin/orders', { method: 'DELETE', headers: getAuthHeaders() });
                    if (res.ok) {
                        bsrDB.clearOrders();
                        showToast('All order database records deleted.');
                        await renderAdminDashboard();
                    } else {
                        const err = await res.json();
                        showToast(err.detail || 'Clear DB failed');
                    }
                } catch (e) {
                    bsrDB.clearOrders();
                    showToast('Clear DB request sent.');
                    await renderAdminDashboard();
                }
            }
        });
    }

    // --- Order Details Modal Controls & Rendering ---
    function openOrderDetailsModal(order) {
        const modal = document.getElementById('order-details-modal');
        const modalIdTitle = document.getElementById('modal-order-id-title');
        const modalDate = document.getElementById('modal-order-date');
        const modalContent = document.getElementById('modal-order-content');

        if (!modal || !modalContent) return;

        if (modalIdTitle) modalIdTitle.textContent = `Order Details #${order.id}`;
        if (modalDate) modalDate.textContent = `Placed On: ${order.date}`;

        const itemsRows = (order.items || []).map((item, idx) => `
            <tr>
                <td style="width: 40px; text-align: center; color: var(--color-text-muted);">${idx + 1}</td>
                <td>
                    <strong style="color: var(--color-primary);">${item.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted);">${item.id && item.id !== 'undefined' ? `ID: ${item.id}` : `Item #${idx + 1}`}</div>
                </td>
                <td style="text-align: center;"><strong>${item.quantity}</strong></td>
                <td style="text-align: right;">₹${item.price}</td>
                <td style="text-align: right; font-weight: 700; color: var(--color-primary);">₹${item.price * item.quantity}</td>
            </tr>
        `).join('');

        const statusPillClass = (order.status || 'Confirmed').toLowerCase().replace(/\s+/g, '-');

        modalContent.innerHTML = `
            <div class="order-detail-grid">
                <div class="order-info-card">
                    <h4>
                        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">person</span>
                        Customer & Order Meta
                    </h4>
                    <div class="order-info-list">
                        <div class="order-info-row"><span>Customer Name:</span> <strong>${order.customerName}</strong></div>
                        <div class="order-info-row"><span>Phone Number:</span> <strong>📞 ${order.phone}</strong></div>
                        <div class="order-info-row"><span>Order Type:</span> <strong style="color: var(--color-secondary);">${order.orderType}</strong></div>
                        <div class="order-info-row"><span>Delivery Address / Table:</span> <strong>📍 ${order.address}</strong></div>
                        <div class="order-info-row"><span>Payment Status:</span> <strong style="color: #16a34a;">Prepaid / Verified</strong></div>
                    </div>
                </div>

                <div class="order-info-card">
                    <h4>
                        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">payments</span>
                        Billing & Coupon Breakdown
                    </h4>
                    <div class="order-info-list">
                        <div class="order-info-row"><span>Subtotal (${order.items.length} items):</span> <span>₹${order.subtotal}</span></div>
                        <div class="order-info-row"><span>Promo Coupon Code:</span> <strong>${order.couponCode || 'None Applied'}</strong></div>
                        ${order.discount > 0 ? `<div class="order-info-row" style="color: #16a34a;"><span>Discount Amount:</span> <span>-₹${order.discount}</span></div>` : ''}
                        <div class="order-info-row"><span>Taxes & Delivery Fee:</span> <span style="color: #16a34a;">₹0 (Free Delivery)</span></div>
                        <div class="order-info-row" style="border-top: 1px dashed var(--color-border-subtle); padding-top: 8px; font-size: 1.05rem;">
                            <strong style="color: var(--color-primary);">Grand Total:</strong>
                            <strong style="color: var(--color-secondary); font-size: 1.2rem;">₹${order.finalTotal}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 1rem; color: var(--color-primary); margin: 0;">Itemized Ordered Dishes (${order.items.length})</h4>
                <span class="status-pill ${statusPillClass}">${order.status}</span>
            </div>

            <table class="order-items-table">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th>Dish Name</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div class="order-action-bar">
                <div class="quick-status-group">
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-text-muted);">Set Status:</span>
                    <button class="quick-status-btn ${order.status === 'Confirmed' ? 'active' : ''}" data-id="${order.id}" data-status="Confirmed">Confirmed</button>
                    <button class="quick-status-btn ${order.status === 'Kitchen Prep' ? 'active' : ''}" data-id="${order.id}" data-status="Kitchen Prep">Kitchen Prep</button>
                    <button class="quick-status-btn ${order.status === 'Out for Delivery' ? 'active' : ''}" data-id="${order.id}" data-status="Out for Delivery">Out for Delivery</button>
                    <button class="quick-status-btn ${order.status === 'Completed' ? 'active' : ''}" data-id="${order.id}" data-status="Completed">Completed</button>
                    <button class="quick-status-btn ${order.status === 'Cancelled' ? 'active' : ''}" data-id="${order.id}" data-status="Cancelled">Cancelled</button>
                </div>

                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary modal-print-btn" style="padding: 8px 16px; font-size: 0.82rem;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">print</span> Print Invoice
                    </button>
                    <button class="btn btn-outline modal-delete-btn" data-id="${order.id}" style="padding: 8px 16px; font-size: 0.82rem; color: #dc2626; border-color: #fca5a5;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span> Delete
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Modal quick status buttons listener
        modalContent.querySelectorAll('.quick-status-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const newStatus = btn.dataset.status;
                const orderId = btn.dataset.id;
                try {
                    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                        method: 'PATCH',
                        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ status: newStatus })
                    });
                    if (res.ok) {
                        showToast(`Order ${orderId} status set to ${newStatus}`);
                        order.status = newStatus;
                        openOrderDetailsModal(order);
                        renderAdminDashboard();
                    } else {
                        showToast('Failed to update status');
                    }
                } catch (e) {
                    showToast(`Status updated to ${newStatus}`);
                }
            });
        });

        // Modal print listener
        const printBtn = modalContent.querySelector('.modal-print-btn');
        if (printBtn) printBtn.addEventListener('click', () => window.print());

        // Modal delete listener
        const deleteBtn = modalContent.querySelector('.modal-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Delete order ${order.id} from database?`)) {
                    try {
                        const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                        if (res.ok) {
                            bsrDB.deleteOrder(order.id);
                            modal.classList.remove('active');
                            showToast(`Order ${order.id} deleted.`);
                            await renderAdminDashboard();
                        } else {
                            const err = await res.json();
                            showToast(err.detail || 'Delete failed');
                        }
                    } catch (e) {
                        bsrDB.deleteOrder(order.id);
                        modal.classList.remove('active');
                        await renderAdminDashboard();
                    }
                }
            });
        }
    }

    const closeOrderDetailsBtn = document.getElementById('close-order-details-modal');
    const orderDetailsModal = document.getElementById('order-details-modal');
    if (closeOrderDetailsBtn && orderDetailsModal) {
        closeOrderDetailsBtn.addEventListener('click', () => orderDetailsModal.classList.remove('active'));
        orderDetailsModal.addEventListener('click', (e) => {
            if (e.target === orderDetailsModal) orderDetailsModal.classList.remove('active');
        });
    }

    // --- Table Reservations & Private Events Modal Controls ---
    const adminResBtn = document.getElementById('admin-res-btn');
    const resModal = document.getElementById('admin-reservations-modal');
    const resContent = document.getElementById('admin-reservations-content');
    const closeResModal = document.getElementById('close-reservations-modal');

    if (adminResBtn && resModal) {
        adminResBtn.addEventListener('click', async () => {
            resModal.classList.add('active');
            if (resContent) resContent.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--color-text-muted);">Fetching table reservations & private event inquiries...</p>';
            try {
                const [res1, res2] = await Promise.all([
                    fetch('/api/admin/reservations'),
                    fetch('/api/admin/private-events')
                ]);

                const reservations = res1.ok ? await res1.json() : [];
                const events = res2.ok ? await res2.json() : [];

                let html = `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 1.1rem; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--color-secondary);">restaurant</span>
                            Table Booking Requests (${reservations.length})
                        </h4>
                `;

                if (reservations.length === 0) {
                    html += `<p style="color: var(--color-text-muted); padding: 12px 0;">No table reservation requests logged yet.</p>`;
                } else {
                    const resRows = reservations.map(r => `
                        <tr>
                            <td>#${r.id}</td>
                            <td><strong style="color: var(--color-primary);">${r.guest_name}</strong></td>
                            <td>📞 ${r.phone}<br>${r.email ? '✉️ ' + r.email : ''}</td>
                            <td style="text-align: center;">👥 <strong>${r.guests_count} Guests</strong></td>
                            <td>📅 ${r.reservation_date}<br>⏰ ${r.reservation_time}</td>
                            <td>${r.special_request || '—'}</td>
                            <td><span class="status-badge" style="background-color: #dbeafe; color: #1e40af;">${r.status}</span></td>
                        </tr>
                    `).join('');

                    html += `
                        <table class="res-table" style="margin-bottom: 24px;">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Guest Name</th>
                                    <th>Contact Info</th>
                                    <th style="text-align: center;">Party Size</th>
                                    <th>Date & Time</th>
                                    <th>Special Notes</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>${resRows}</tbody>
                        </table>
                    `;
                }

                html += `
                    <h4 style="font-size: 1.1rem; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: var(--color-secondary);">celebration</span>
                        Private Dining & Event Inquiries (${events.length})
                    </h4>
                `;

                if (events.length === 0) {
                    html += `<p style="color: var(--color-text-muted); padding: 12px 0;">No private event inquiries recorded yet.</p>`;
                } else {
                    const eventRows = events.map(e => `
                        <tr>
                            <td>#${e.id}</td>
                            <td><strong style="color: var(--color-primary);">${e.organizer_name}</strong></td>
                            <td>📞 ${e.phone}<br>${e.email ? '✉️ ' + e.email : ''}</td>
                            <td><strong style="color: var(--color-secondary);">${e.event_type}</strong></td>
                            <td style="text-align: center;">👥 <strong>${e.guest_count} Guests</strong></td>
                            <td>📅 ${e.event_date}<br>⏰ ${e.event_time || 'TBD'}</td>
                            <td>${e.special_notes || '—'}</td>
                            <td><span class="status-badge" style="background-color: #fef3c7; color: #b45309;">${e.status}</span></td>
                        </tr>
                    `).join('');

                    html += `
                        <table class="res-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Organizer</th>
                                    <th>Contact</th>
                                    <th>Event Type</th>
                                    <th style="text-align: center;">Guests</th>
                                    <th>Date & Time</th>
                                    <th>Notes</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>${eventRows}</tbody>
                        </table>
                    `;
                }

                html += `</div>`;
                resContent.innerHTML = html;

            } catch (err) {
                resContent.innerHTML = '<p style="color: var(--color-secondary); padding: 16px;">Failed to load reservations and event inquiries.</p>';
            }
        });
    }

    if (closeResModal && resModal) {
        closeResModal.addEventListener('click', () => resModal.classList.remove('active'));
        resModal.addEventListener('click', (e) => {
            if (e.target === resModal) resModal.classList.remove('active');
        });
    }

    // Audit Logs Modal Controls
    if (adminAuditBtn && auditModal) {
        adminAuditBtn.addEventListener('click', async () => {
            auditModal.classList.add('active');
            if (auditContent) auditContent.innerHTML = 'Fetching security audit logs...';
            try {
                const res = await fetch('/api/admin/audit-logs');
                if (res.ok) {
                    const logs = await res.json();
                    if (logs.length === 0) {
                        auditContent.innerHTML = 'No audit log entries recorded yet.';
                    } else {
                        auditContent.innerHTML = logs.map(l => 
                            `[${new Date(l.timestamp).toLocaleString()}] IP:${l.ip_address} USER:${l.username} ACTION:${l.action} ${l.details || ''}`
                        ).join('<br>');
                    }
                } else {
                    auditContent.innerHTML = 'Failed to load audit logs (Session expired).';
                }
            } catch (err) {
                auditContent.innerHTML = 'Audit log retrieval failed.';
            }
        });
    }

    if (closeAuditBtn && auditModal) {
        closeAuditBtn.addEventListener('click', () => auditModal.classList.remove('active'));
    }

    // Change Password Modal Controls
    if (adminChpwBtn && chpwModal) {
        adminChpwBtn.addEventListener('click', () => {
            chpwModal.classList.add('active');
            if (chpwMsg) chpwMsg.classList.add('hidden');
        });
    }

    if (closeChpwBtn && chpwModal) {
        closeChpwBtn.addEventListener('click', () => chpwModal.classList.remove('active'));
    }

    if (chpwForm) {
        chpwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const curPw = document.getElementById('chpw-current').value;
            const newPw = document.getElementById('chpw-new').value;

            try {
                const res = await fetch('/api/admin/change-password', {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ current_password: curPw, new_password: newPw })
                });

                if (res.ok) {
                    showToast('Admin password updated successfully!');
                    chpwForm.reset();
                    chpwModal.classList.remove('active');
                } else {
                    const err = await res.json();
                    if (chpwMsg) {
                        chpwMsg.textContent = err.detail || 'Password change failed.';
                        chpwMsg.className = 'coupon-msg error';
                        chpwMsg.classList.remove('hidden');
                    }
                }
            } catch (err) {
                showToast('Failed to update password.');
            }
        });
    }

    // --- Dashboard Section Tab Switcher & Navigation ---
    const tabOrders = document.getElementById('admin-tab-orders');
    const tabReservations = document.getElementById('admin-tab-reservations');
    const tabEmployees = document.getElementById('admin-tab-employees');
    const tabUsers = document.getElementById('admin-tab-users');
    const tabAudit = document.getElementById('admin-tab-audit');

    const panelOrders = document.getElementById('panel-orders-view');
    const panelReservations = document.getElementById('panel-reservations-view');
    const panelEmployees = document.getElementById('panel-employees-view');
    const panelUsers = document.getElementById('panel-users-view');
    const panelAudit = document.getElementById('panel-audit-view');
    const ordersToolbar = document.getElementById('admin-orders-toolbar');

    const refreshResBtn = document.getElementById('admin-refresh-res-btn');
    const refreshAuditBtn = document.getElementById('admin-refresh-audit-btn');
    const adminResetFiltersBtn = document.getElementById('admin-reset-filters-btn');

    if (adminResetFiltersBtn) {
        adminResetFiltersBtn.addEventListener('click', () => {
            if (adminSearchInput) adminSearchInput.value = '';
            if (adminStatusFilter) adminStatusFilter.value = 'ALL';
            if (adminTypeFilter) adminTypeFilter.value = 'ALL';
            renderAdminDashboard();
            showToast('Search & Filters Reset!');
        });
    }

    function switchAdminTab(activeTab) {
        if (tabOrders) tabOrders.classList.remove('active');
        if (tabReservations) tabReservations.classList.remove('active');
        if (tabEmployees) tabEmployees.classList.remove('active');
        if (tabUsers) tabUsers.classList.remove('active');
        if (tabAudit) tabAudit.classList.remove('active');

        if (panelOrders) panelOrders.classList.add('hidden');
        if (panelReservations) panelReservations.classList.add('hidden');
        if (panelEmployees) panelEmployees.classList.add('hidden');
        if (panelUsers) panelUsers.classList.add('hidden');
        if (panelAudit) panelAudit.classList.add('hidden');
        if (ordersToolbar) ordersToolbar.classList.add('hidden');

        if (activeTab === 'orders') {
            if (tabOrders) tabOrders.classList.add('active');
            if (panelOrders) panelOrders.classList.remove('hidden');
            if (ordersToolbar) ordersToolbar.classList.remove('hidden');
            renderAdminDashboard();
        } else if (activeTab === 'reservations') {
            if (tabReservations) tabReservations.classList.add('active');
            if (panelReservations) panelReservations.classList.remove('hidden');
            loadInlineReservations();
        } else if (activeTab === 'employees') {
            if (tabEmployees) tabEmployees.classList.add('active');
            if (panelEmployees) panelEmployees.classList.remove('hidden');
            loadInlineEmployees();
        } else if (activeTab === 'users') {
            if (tabUsers) tabUsers.classList.add('active');
            if (panelUsers) panelUsers.classList.remove('hidden');
            loadInlineAdminUsers();
        } else if (activeTab === 'audit') {
            if (tabAudit) tabAudit.classList.add('active');
            if (panelAudit) panelAudit.classList.remove('hidden');
            loadInlineAuditLogs();
        }
    }

    if (tabOrders) tabOrders.addEventListener('click', () => switchAdminTab('orders'));
    if (tabReservations) tabReservations.addEventListener('click', () => switchAdminTab('reservations'));
    if (tabEmployees) tabEmployees.addEventListener('click', () => switchAdminTab('employees'));
    if (tabUsers) tabUsers.addEventListener('click', () => switchAdminTab('users'));
    if (tabAudit) tabAudit.addEventListener('click', () => switchAdminTab('audit'));

    // Link Header Action Buttons directly to Main Tabs
    if (adminResBtn) {
        adminResBtn.addEventListener('click', () => switchAdminTab('reservations'));
    }
    if (adminAuditBtn) {
        adminAuditBtn.addEventListener('click', () => switchAdminTab('audit'));
    }

    // KPI Metric Card Click Handlers
    const cardOrders = document.getElementById('metric-card-orders');
    const cardRevenue = document.getElementById('metric-card-revenue');
    const cardActive = document.getElementById('metric-card-active');
    const cardCompleted = document.getElementById('metric-card-completed');
    const cardReservations = document.getElementById('metric-card-reservations');

    if (cardOrders) cardOrders.addEventListener('click', () => {
        if (adminStatusFilter) adminStatusFilter.value = 'ALL';
        if (adminTypeFilter) adminTypeFilter.value = 'ALL';
        switchAdminTab('orders');
    });
    if (cardRevenue) cardRevenue.addEventListener('click', () => {
        if (adminStatusFilter) adminStatusFilter.value = 'Completed';
        switchAdminTab('orders');
    });
    if (cardActive) cardActive.addEventListener('click', () => {
        if (adminStatusFilter) adminStatusFilter.value = 'Kitchen Prep';
        switchAdminTab('orders');
    });
    if (cardCompleted) cardCompleted.addEventListener('click', () => {
        if (adminStatusFilter) adminStatusFilter.value = 'Completed';
        switchAdminTab('orders');
    });
    if (cardReservations) cardReservations.addEventListener('click', () => {
        switchAdminTab('reservations');
    });

    if (refreshResBtn) refreshResBtn.addEventListener('click', loadInlineReservations);
    if (refreshAuditBtn) refreshAuditBtn.addEventListener('click', loadInlineAuditLogs);

    // --- Employee Management Handlers ---
    const refreshEmployeesBtn = document.getElementById('admin-refresh-employees-btn');
    const openAddEmployeeModal = document.getElementById('open-add-employee-modal');
    const closeAddEmployeeModal = document.getElementById('close-add-employee-modal');
    const addEmployeeModal = document.getElementById('add-employee-modal');
    const addEmployeeForm = document.getElementById('add-employee-form');
    const addEmployeeMsg = document.getElementById('add-employee-msg');
    const employeeSearch = document.getElementById('admin-employee-search');

    const empOutletFilter = document.getElementById('admin-employee-outlet-filter');
    const empSortSelect = document.getElementById('admin-employee-sort');

    if (refreshEmployeesBtn) refreshEmployeesBtn.addEventListener('click', loadInlineEmployees);
    if (empOutletFilter) empOutletFilter.addEventListener('change', loadInlineEmployees);
    if (empSortSelect) empSortSelect.addEventListener('change', loadInlineEmployees);
    if (employeeSearch) employeeSearch.addEventListener('input', debounce(loadInlineEmployees, 300));

    if (openAddEmployeeModal && addEmployeeModal) {
        openAddEmployeeModal.addEventListener('click', () => {
            addEmployeeModal.classList.add('active');
            if (addEmployeeMsg) addEmployeeMsg.classList.add('hidden');
        });
    }
    if (closeAddEmployeeModal && addEmployeeModal) {
        closeAddEmployeeModal.addEventListener('click', () => addEmployeeModal.classList.remove('active'));
    }

    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (window.currentAdminRole === 'Staff') {
                showToast('⛔ Access Denied: Staff role is not authorized to add staff members.');
                if (addEmployeeMsg) {
                    addEmployeeMsg.textContent = 'Access Denied: Staff role is not authorized to add staff members.';
                    addEmployeeMsg.className = 'coupon-msg error';
                    addEmployeeMsg.classList.remove('hidden');
                }
                return;
            }

            const name = document.getElementById('emp-name').value.trim();
            const position = document.getElementById('emp-position').value.trim();
            const department = document.getElementById('emp-department').value;
            const outletId = document.getElementById('emp-outlet-id') ? document.getElementById('emp-outlet-id').value : 'OUTLET-01';
            const phone = document.getElementById('emp-phone').value.trim();

            try {
                const res = await fetch('/api/admin/employees', {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ name, position, department, phone, outlet_id: outletId })
                });

                if (res.ok) {
                    showToast(`Staff member '${name}' added!`);
                    addEmployeeForm.reset();
                    if (addEmployeeModal) addEmployeeModal.classList.remove('active');
                    loadInlineEmployees();
                } else {
                    const err = await res.json();
                    if (addEmployeeMsg) {
                        addEmployeeMsg.textContent = err.detail || 'Failed to add employee.';
                        addEmployeeMsg.className = 'coupon-msg error';
                        addEmployeeMsg.classList.remove('hidden');
                    }
                }
            } catch (err) {
                showToast('Failed to add employee.');
            }
        });
    }

    async function loadInlineEmployees() {
        const container = document.getElementById('inline-employees-content');
        if (!container) return;
        container.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--color-text-muted);">Loading employee directory...</p>';

        try {
            const query = employeeSearch ? employeeSearch.value.trim() : '';
            const outletFilterVal = empOutletFilter ? empOutletFilter.value : 'ALL';
            const sortVal = empSortSelect ? empSortSelect.value : 'default';

            const params = new URLSearchParams();
            if (query) params.append('search', query);
            if (outletFilterVal !== 'ALL') params.append('outlet_filter', outletFilterVal);
            if (sortVal !== 'default') params.append('sort_by', sortVal);

            params.append('_t', Date.now());

            const res = await fetch(`/api/admin/employees?${params.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' });

            if (res.ok) {
                const employees = await res.json();
                if (employees.length === 0) {
                    container.innerHTML = '<p style="color: var(--color-text-muted); padding: 16px;">No employee records found.</p>';
                } else {
                    const isSuperUser = window.currentAdminRole === 'Super Admin' || window.currentAdminRole === 'Super Manager';

                    const rows = employees.map(e => `
                        <tr>
                            <td>#${e.id}</td>
                            <td><strong style="color: var(--color-primary);">${e.name}</strong></td>
                            <td><span style="font-weight: 600; color: var(--color-secondary);">${e.position}</span></td>
                            <td>${e.department}</td>
                            <td>
                                ${isSuperUser ? `
                                    <select class="status-select admin-emp-outlet-change" data-id="${e.id}" title="Super Manager/Admin: Change Outlet">
                                        <option value="OUTLET-01" ${e.outlet_id === 'OUTLET-01' ? 'selected' : ''}>📍 OUTLET-01</option>
                                        <option value="OUTLET-02" ${e.outlet_id === 'OUTLET-02' ? 'selected' : ''}>📍 OUTLET-02</option>
                                        <option value="OUTLET-03" ${e.outlet_id === 'OUTLET-03' ? 'selected' : ''}>📍 OUTLET-03</option>
                                    </select>
                                ` : `
                                    <span style="font-size: 0.75rem; font-weight: 700; background-color: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 4px; color: var(--color-primary);">📍 ${e.outlet_id || 'OUTLET-01'}</span>
                                `}
                            </td>
                            <td>📞 ${e.phone}</td>
                            <td>
                                <select class="status-select admin-emp-status-change" data-id="${e.id}">
                                    <option value="Active" ${e.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="Inactive" ${e.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="On Leave" ${e.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
                                </select>
                            </td>
                            <td style="text-align: center;">
                                <button class="btn btn-outline admin-emp-delete-btn" data-id="${e.id}" data-name="${e.name}" style="padding: 2px 8px; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;">
                                    <span class="material-symbols-outlined" style="font-size: 14px;">delete</span> Delete
                                </button>
                            </td>
                        </tr>
                    `).join('');

                    container.innerHTML = `
                        <table class="res-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Employee Name</th>
                                    <th>Position / Title</th>
                                    <th>Department</th>
                                    <th>Assigned Outlet</th>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    `;

                    // Wire outlet change (Super Admin & Super Manager only)
                    container.querySelectorAll('.admin-emp-outlet-change').forEach(select => {
                        select.addEventListener('change', async () => {
                            const empId = select.dataset.id;
                            const newOutlet = select.value;
                            try {
                                const r = await fetch(`/api/admin/employees/${empId}/outlet`, {
                                    method: 'PATCH',
                                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                    body: JSON.stringify({ outlet_id: newOutlet })
                                });
                                if (r.ok) {
                                    showToast(`Employee #${empId} reassigned to ${newOutlet}`);
                                } else {
                                    const err = await r.json();
                                    showToast(err.detail || 'Failed to update outlet assignment.');
                                    loadInlineEmployees();
                                }
                            } catch (e) {
                                showToast('Failed to update outlet assignment.');
                            }
                        });
                    });

                    // Wire status change
                    container.querySelectorAll('.admin-emp-status-change').forEach(select => {
                        select.addEventListener('change', async () => {
                            const empId = select.dataset.id;
                            const newStatus = select.value;
                            try {
                                const r = await fetch(`/api/admin/employees/${empId}/status`, {
                                    method: 'PATCH',
                                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                    body: JSON.stringify({ status: newStatus })
                                });
                                if (r.ok) {
                                    showToast(`Employee #${empId} status set to ${newStatus}`);
                                } else {
                                    showToast('Failed to update status.');
                                }
                            } catch (e) {
                                showToast(`Employee #${empId} status set to ${newStatus}`);
                            }
                        });
                    });

                    // Wire delete button
                    container.querySelectorAll('.admin-emp-delete-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const empId = btn.dataset.id;
                            const empName = btn.dataset.name;
                            if (confirmDoubleDelete(`employee '${empName}'`)) {
                                try {
                                    const r = await fetch(`/api/admin/employees/${empId}`, { method: 'DELETE', headers: getAuthHeaders() });
                                    if (r.ok) {
                                        showToast(`Employee '${empName}' deleted.`);
                                        loadInlineEmployees();
                                    }
                                } catch (e) {
                                    showToast('Failed to delete employee.');
                                }
                            }
                        });
                    });
                }
            } else {
                container.innerHTML = '<p style="color: #f87171; padding: 16px;">Access Denied (Manager, Super Manager, or Super Admin role required).</p>';
            }
        } catch (err) {
            container.innerHTML = '<p style="color: var(--color-secondary); padding: 16px;">Failed to load employee directory.</p>';
        }
    }

    // --- Admin Accounts & RBAC Handlers ---
    const refreshUsersBtn = document.getElementById('admin-refresh-users-btn');
    const openAddAdminModal = document.getElementById('open-add-admin-modal');
    const closeAddAdminModal = document.getElementById('close-add-admin-modal');
    const addAdminModal = document.getElementById('add-admin-modal');
    const addAdminForm = document.getElementById('add-admin-form');
    const addAdminMsg = document.getElementById('add-admin-msg');

    if (refreshUsersBtn) refreshUsersBtn.addEventListener('click', loadInlineAdminUsers);

    if (openAddAdminModal && addAdminModal) {
        openAddAdminModal.addEventListener('click', () => {
            addAdminModal.classList.add('active');
            if (addAdminMsg) addAdminMsg.classList.add('hidden');
        });
    }
    if (closeAddAdminModal && addAdminModal) {
        closeAddAdminModal.addEventListener('click', () => addAdminModal.classList.remove('active'));
    }

    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-new-username').value.trim();
            const password = document.getElementById('admin-new-password').value.trim();
            const role = document.getElementById('admin-new-role').value;

            try {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ username, password, role })
                });

                if (res.ok) {
                    showToast(`Admin account '${username}' created with role '${role}'!`);
                    addAdminForm.reset();
                    if (addAdminModal) addAdminModal.classList.remove('active');
                    loadInlineAdminUsers();
                } else {
                    const err = await res.json();
                    if (addAdminMsg) {
                        addAdminMsg.textContent = err.detail || 'Failed to create admin user.';
                        addAdminMsg.className = 'coupon-msg error';
                        addAdminMsg.classList.remove('hidden');
                    }
                }
            } catch (err) {
                showToast('Failed to create admin user.');
            }
        });
    }

    async function loadInlineAdminUsers() {
        const container = document.getElementById('inline-users-content');
        if (!container) return;
        container.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--color-text-muted);">Loading admin accounts & security roles...</p>';

        if (window.currentAdminRole && window.currentAdminRole !== 'Super Admin' && window.currentAdminRole !== 'Super Manager') {
            container.innerHTML = '<p style="color: #dc2626; font-weight: 700; padding: 24px; text-align: center; background: #fee2e2; border-radius: 8px; font-size: 1rem;">⛔ RESTRICTED ACCESS: Only Super Admin or Super Manager authority can view or manage RBAC Admin Accounts.</p>';
            return;
        }

        try {
            const activeAdminUser = (adminUserDisplay ? adminUserDisplay.textContent : '').trim();
            const res = await fetch('/api/admin/users?_t=' + Date.now(), { headers: getAuthHeaders(), cache: 'no-store' });
            if (res.ok) {
                const users = await res.json();
                const cardsHtml = users.map(u => {
                    const isSelf = activeAdminUser && (u.username.toLowerCase() === activeAdminUser.toLowerCase());
                    return `
                        <div class="rbac-user-card ${isSelf ? 'is-self-card' : ''}">
                            <div class="rbac-user-info">
                                <div class="rbac-avatar">
                                    <span class="material-symbols-outlined">person</span>
                                </div>
                                <div>
                                    <div class="rbac-username-row">
                                        <span class="rbac-username">${u.username}</span>
                                        ${isSelf ? '<span class="rbac-self-pill">YOU</span>' : ''}
                                        <span class="rbac-status-dot ${u.is_active ? 'active' : 'disabled'}">${u.is_active ? 'Active' : 'Disabled'}</span>
                                    </div>
                                    <div class="rbac-user-meta">
                                        <span>Account ID: <strong style="color: #475569;">#${u.id}</strong></span>
                                        <span>• Created: <strong style="color: #475569;">${new Date(u.created_at).toLocaleDateString()}</strong></span>
                                        <span>• Outlet: <strong style="color: var(--color-primary);">📍 ${u.outlet_id || 'OUTLET-01'}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div class="rbac-controls-group">
                                <div class="rbac-role-box">
                                    <label class="rbac-role-label">Authority Level</label>
                                    ${isSelf ? `
                                        <div class="rbac-protected-role" title="Self-demotion protection: SuperAdmin cannot change their own role.">
                                            <span class="material-symbols-outlined">shield</span>
                                            <span>${u.role || 'Super Admin'} (Protected)</span>
                                        </div>
                                    ` : `
                                        <select class="rbac-role-select-card admin-role-change" data-id="${u.id}" data-username="${u.username}" title="Change Authority Role for ${u.username}">
                                            <option value="Super Admin" ${u.role === 'Super Admin' ? 'selected' : ''}>👑 Super Admin</option>
                                            <option value="Super Manager" ${u.role === 'Super Manager' ? 'selected' : ''}>🛡️ Super Manager</option>
                                            <option value="Manager" ${u.role === 'Manager' ? 'selected' : ''}>🏢 Manager</option>
                                            <option value="Staff" ${u.role === 'Staff' ? 'selected' : ''}>👤 Staff</option>
                                        </select>
                                    `}
                                </div>

                                <div class="rbac-role-box">
                                    <label class="rbac-role-label">Assigned Outlet</label>
                                    <select class="rbac-role-select-card admin-user-outlet-change" data-id="${u.id}" data-username="${u.username}" title="Reassign Outlet for ${u.username}">
                                        <option value="OUTLET-01" ${u.outlet_id === 'OUTLET-01' ? 'selected' : ''}>📍 OUTLET-01 (Main)</option>
                                        <option value="OUTLET-02" ${u.outlet_id === 'OUTLET-02' ? 'selected' : ''}>📍 OUTLET-02 (Dhanmondi)</option>
                                        <option value="OUTLET-03" ${u.outlet_id === 'OUTLET-03' ? 'selected' : ''}>📍 OUTLET-03 (Gulshan)</option>
                                    </select>
                                </div>

                                <div class="rbac-buttons-group">
                                    <button class="btn-rbac-action btn-rbac-action-pw admin-user-pw-edit-btn" data-id="${u.id}" data-username="${u.username}" title="Change/Reset Password for account '${u.username}'">
                                        <span class="material-symbols-outlined">key</span>
                                        <span>${isSelf ? 'Change Password' : 'Reset Password'}</span>
                                    </button>
                                    ${isSelf ? '<span class="rbac-self-note">Active Account</span>' : `
                                        <button class="btn-rbac-action btn-rbac-action-del admin-user-delete-btn" data-id="${u.id}" data-username="${u.username}" title="Permanently remove account '${u.username}'">
                                            <span class="material-symbols-outlined">delete</span>
                                            <span>Remove</span>
                                        </button>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                container.innerHTML = `
                    <div class="rbac-cards-container">
                        ${cardsHtml}
                    </div>
                `;

                // Wire Role Change Listener with Confirmation Pop-up
                container.querySelectorAll('.admin-role-change').forEach(select => {
                    let currentVal = select.value;
                    select.addEventListener('focus', () => { currentVal = select.value; });
                    select.addEventListener('change', async () => {
                        const userId = select.dataset.id;
                        const targetUser = select.dataset.username;
                        const newRole = select.value;

                        const confirmChange = confirm(`⚠️ ROLE DEMOTION / ACCESS CHANGE CONFIRMATION:\n\nAre you sure you want to change authority role for user '${targetUser}' from '${currentVal}' to '${newRole}'?`);
                        if (!confirmChange) {
                            select.value = currentVal;
                            return;
                        }

                        try {
                            const r = await fetch(`/api/admin/users/${userId}/role`, {
                                method: 'PATCH',
                                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ role: newRole })
                            });
                            if (r.ok) {
                                showToast(`Role for user '${targetUser}' set to ${newRole}`);
                                loadInlineAdminUsers();
                            } else {
                                const err = await r.json();
                                showToast(err.detail || 'Failed to update role');
                                select.value = currentVal;
                            }
                        } catch (e) {
                            showToast('Failed to update role');
                            select.value = currentVal;
                        }
                    });
                });

                // Wire Admin Outlet Reassignment Listener (Super Admin & Super Manager only)
                container.querySelectorAll('.admin-user-outlet-change').forEach(select => {
                    select.addEventListener('change', async () => {
                        const userId = select.dataset.id;
                        const targetUser = select.dataset.username;
                        const newOutlet = select.value;

                        try {
                            const r = await fetch(`/api/admin/users/${userId}/outlet`, {
                                method: 'PATCH',
                                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ outlet_id: newOutlet })
                            });
                            if (r.ok) {
                                showToast(`Admin '${targetUser}' reassigned to ${newOutlet}`);
                                loadInlineAdminUsers();
                            } else {
                                const err = await r.json();
                                showToast(err.detail || 'Failed to reassign outlet');
                            }
                        } catch (e) {
                            showToast('Failed to reassign outlet');
                        }
                    });
                });

                // Wire Admin Password Reset Listener (for non-Super Admin accounts)
                container.querySelectorAll('.admin-user-pw-edit-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const userId = btn.dataset.id;
                        const uname = btn.dataset.username;
                        const newPw = prompt(`🔑 RESET PASSWORD for admin account '${uname}':\n\nEnter new password (minimum 8 characters):`);
                        if (!newPw) return;
                        if (newPw.trim().length < 8) {
                            showToast('Password must be at least 8 characters long.');
                            return;
                        }

                        try {
                            const res = await fetch(`/api/admin/users/${userId}/password`, {
                                method: 'PATCH',
                                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ new_password: newPw.trim() })
                            });
                            if (res.ok) {
                                showToast(`🔑 Password updated successfully for account '${uname}'!`);
                            } else {
                                const err = await res.json();
                                showToast(err.detail || 'Password update failed.');
                            }
                        } catch (e) {
                            showToast('Failed to update password.');
                        }
                    });
                });

                // Wire Admin Account Delete Listener with 2-Step Confirmation
                container.querySelectorAll('.admin-user-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const userId = btn.dataset.id;
                        const uname = btn.dataset.username;
                        if (confirmDoubleDelete(`admin user account '${uname}'`)) {
                            try {
                                const r = await fetch(`/api/admin/users/${userId}`, {
                                    method: 'DELETE',
                                    headers: getAuthHeaders()
                                });
                                if (r.ok) {
                                    showToast(`Admin account '${uname}' deleted successfully.`);
                                    loadInlineAdminUsers();
                                } else {
                                    const err = await r.json();
                                    showToast(err.detail || 'Failed to delete admin user.');
                                }
                            } catch (e) {
                                showToast('Failed to delete admin user.');
                            }
                        }
                    });
                });

            } else {
                container.innerHTML = '<p style="color: #dc2626; font-weight: 700; padding: 24px; text-align: center; background: #fee2e2; border-radius: 8px; font-size: 1rem;">⛔ RESTRICTED ACCESS: Only Super Admin authority can view or manage RBAC Admin Accounts.</p>';
            }
        } catch (err) {
            container.innerHTML = '<p style="color: #dc2626; font-weight: 700; padding: 24px; text-align: center; background: #fee2e2; border-radius: 8px; font-size: 1rem;">⛔ RESTRICTED ACCESS: Only Super Admin authority can view or manage RBAC Admin Accounts.</p>';
        }
    }

    async function loadInlineReservations() {
        const container = document.getElementById('inline-reservations-content');
        if (!container) return;
        container.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--color-text-muted);">Loading table reservations & private event inquiries...</p>';
        try {
            const query = adminSearchInput ? adminSearchInput.value.trim() : '';
            const outletFilterVal = adminOutletFilter ? adminOutletFilter.value : 'ALL';
            const params = new URLSearchParams();
            if (query) params.append('search', query);
            if (outletFilterVal !== 'ALL') params.append('outlet_filter', outletFilterVal);

            params.append('_t', Date.now());

            const [res1, res2] = await Promise.all([
                fetch(`/api/admin/reservations?${params.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' }),
                fetch(`/api/admin/private-events?${params.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' })
            ]);

            const reservations = res1.ok ? await res1.json() : [];
            const events = res2.ok ? await res2.json() : [];

            let html = `
                <div style="margin-bottom: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                        <h4 style="font-size: 1.1rem; color: var(--color-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--color-secondary);">restaurant</span>
                            Table Booking Requests (${reservations.length})
                        </h4>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button id="admin-delete-selected-res-btn" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #dc2626; border-color: #fca5a5;" title="Delete Selected Reservations">
                                <span class="material-symbols-outlined" style="font-size: 14px;">checklist</span> Delete Selected (<span id="selected-res-count">0</span>)
                            </button>
                            <button id="admin-wipe-res-btn" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #dc2626; border-color: #fca5a5; background: #fff5f5;" title="Wipe All Table Reservations">
                                <span class="material-symbols-outlined" style="font-size: 14px;">delete_forever</span> Wipe All Bookings
                            </button>
                        </div>
                    </div>
            `;

            if (reservations.length === 0) {
                html += `<p style="color: var(--color-text-muted); padding: 12px 0;">No table reservation requests logged yet.</p>`;
            } else {
                const resRows = reservations.map(r => `
                    <tr>
                        <td style="text-align: center;"><input type="checkbox" class="res-select-checkbox" data-id="${r.id}" style="cursor: pointer;"></td>
                        <td>#${r.id}</td>
                        <td><strong style="color: var(--color-primary);">${r.guest_name}</strong></td>
                        <td><span style="font-size: 0.75rem; font-weight: 700; background-color: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 4px; color: var(--color-primary);">📍 ${r.outlet_id || 'OUTLET-01'}</span></td>
                        <td>📞 ${r.phone}<br>${r.email ? '✉️ ' + r.email : ''}</td>
                        <td style="text-align: center;">👥 <strong>${r.guests_count} Guests</strong></td>
                        <td>📅 ${r.reservation_date}<br>⏰ ${r.reservation_time}</td>
                        <td>${r.special_request || '—'}</td>
                        <td>
                            <select class="status-select admin-res-status-change" data-id="${r.id}">
                                <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Confirmed" ${r.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${r.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td style="text-align: center;">
                            <button class="btn btn-outline admin-res-delete-btn" data-id="${r.id}" style="padding: 2px 8px; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;" title="Delete Reservation">
                                <span class="material-symbols-outlined" style="font-size: 14px;">delete</span> Delete
                            </button>
                        </td>
                    </tr>
                `).join('');

                html += `
                    <table class="res-table" style="margin-bottom: 24px;">
                        <thead>
                            <tr>
                                <th style="width: 36px; text-align: center;"><input type="checkbox" id="select-all-res-checkbox" style="cursor: pointer;" title="Select All Bookings"></th>
                                <th>ID</th>
                                <th>Guest Name</th>
                                <th>Outlet</th>
                                <th>Contact Info</th>
                                <th style="text-align: center;">Party Size</th>
                                <th>Date & Time</th>
                                <th>Special Notes</th>
                                <th>Status Action</th>
                                <th style="text-align: center;">Manage</th>
                            </tr>
                        </thead>
                        <tbody>${resRows}</tbody>
                    </table>
                `;
            }

            html += `
                <div style="margin-top: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                        <h4 style="font-size: 1.1rem; color: var(--color-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--color-secondary);">celebration</span>
                            Private Dining & Event Inquiries (${events.length})
                        </h4>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button id="admin-delete-selected-events-btn" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #dc2626; border-color: #fca5a5;" title="Delete Selected Events">
                                <span class="material-symbols-outlined" style="font-size: 14px;">checklist</span> Delete Selected (<span id="selected-events-count">0</span>)
                            </button>
                            <button id="admin-wipe-events-btn" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #dc2626; border-color: #fca5a5; background: #fff5f5;" title="Wipe All Event Inquiries">
                                <span class="material-symbols-outlined" style="font-size: 14px;">delete_forever</span> Wipe All Events
                            </button>
                        </div>
                    </div>
            `;

            if (events.length === 0) {
                html += `<p style="color: var(--color-text-muted); padding: 12px 0;">No private event inquiries recorded yet.</p>`;
            } else {
                const eventRows = events.map(e => `
                    <tr>
                        <td style="text-align: center;"><input type="checkbox" class="event-select-checkbox" data-id="${e.id}" style="cursor: pointer;"></td>
                        <td>#${e.id}</td>
                        <td><strong style="color: var(--color-primary);">${e.organizer_name}</strong></td>
                        <td><span style="font-size: 0.75rem; font-weight: 700; background-color: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 4px; color: var(--color-primary);">📍 ${e.outlet_id || 'OUTLET-01'}</span></td>
                        <td>📞 ${e.phone}<br>${e.email ? '✉️ ' + e.email : ''}</td>
                        <td><strong style="color: var(--color-secondary);">${e.event_type}</strong></td>
                        <td style="text-align: center;">👥 <strong>${e.guest_count} Guests</strong></td>
                        <td>📅 ${e.event_date}<br>⏰ ${e.event_time || 'TBD'}</td>
                        <td>${e.special_notes || '—'}</td>
                        <td>
                            <select class="status-select admin-event-status-change" data-id="${e.id}">
                                <option value="Pending" ${e.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Confirmed" ${e.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="Completed" ${e.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${e.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td style="text-align: center;">
                            <button class="btn btn-outline admin-event-delete-btn" data-id="${e.id}" style="padding: 2px 8px; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;" title="Delete Event">
                                <span class="material-symbols-outlined" style="font-size: 14px;">delete</span> Delete
                            </button>
                        </td>
                    </tr>
                `).join('');

                html += `
                    <table class="res-table">
                        <thead>
                            <tr>
                                <th style="width: 36px; text-align: center;"><input type="checkbox" id="select-all-events-checkbox" style="cursor: pointer;" title="Select All Events"></th>
                                <th>ID</th>
                                <th>Organizer</th>
                                <th>Outlet</th>
                                <th>Contact</th>
                                <th>Event Type</th>
                                <th style="text-align: center;">Guests</th>
                                <th>Date & Time</th>
                                <th>Notes</th>
                                <th>Status Action</th>
                                <th style="text-align: center;">Manage</th>
                            </tr>
                        </thead>
                        <tbody>${eventRows}</tbody>
                    </table>
                `;
            }

            html += `</div></div>`;
            container.innerHTML = html;

            // Wire Reservation Checkbox Selection & Batch/Wipe Listeners
            const selectAllResCheckbox = container.querySelector('#select-all-res-checkbox');
            const resCheckboxes = container.querySelectorAll('.res-select-checkbox');
            const selectedResCount = container.querySelector('#selected-res-count');

            function updateSelectedResCount() {
                const checked = container.querySelectorAll('.res-select-checkbox:checked');
                if (selectedResCount) selectedResCount.textContent = checked.length;
            }

            if (selectAllResCheckbox) {
                selectAllResCheckbox.addEventListener('change', () => {
                    resCheckboxes.forEach(cb => cb.checked = selectAllResCheckbox.checked);
                    updateSelectedResCount();
                });
            }
            resCheckboxes.forEach(cb => cb.addEventListener('change', updateSelectedResCount));

            // Wire Wipe All Bookings with Double Confirmation
            const wipeResBtn = container.querySelector('#admin-wipe-res-btn');
            if (wipeResBtn) {
                wipeResBtn.addEventListener('click', async () => {
                    if (confirmDoubleDelete('ALL Table Reservations in the entire database')) {
                        try {
                            const r = await fetch('/api/admin/reservations', { method: 'DELETE', headers: getAuthHeaders() });
                            if (r.ok) {
                                showToast('All table reservations wiped successfully.');
                                loadInlineReservations();
                            } else {
                                const err = await r.json();
                                showToast(err.detail || 'Wipe reservations failed.');
                            }
                        } catch (e) {
                            showToast('Wipe reservations failed.');
                        }
                    }
                });
            }

            // Wire Delete Selected Bookings with Double Confirmation
            const deleteSelectedResBtn = container.querySelector('#admin-delete-selected-res-btn');
            if (deleteSelectedResBtn) {
                deleteSelectedResBtn.addEventListener('click', async () => {
                    const checked = container.querySelectorAll('.res-select-checkbox:checked');
                    const selectedIds = Array.from(checked).map(cb => cb.dataset.id);
                    if (selectedIds.length === 0) {
                        showToast('Please select at least one table reservation to delete.');
                        return;
                    }

                    if (confirmDoubleDelete(`${selectedIds.length} selected table reservation(s)`)) {
                        try {
                            const r = await fetch('/api/admin/reservations/batch-delete', {
                                method: 'POST',
                                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ ids: selectedIds })
                            });
                            if (r.ok) {
                                const data = await r.json();
                                showToast(data.message || `Deleted ${selectedIds.length} reservation(s).`);
                                loadInlineReservations();
                            } else {
                                const err = await r.json();
                                showToast(err.detail || 'Batch delete failed.');
                            }
                        } catch (e) {
                            showToast('Batch delete failed.');
                        }
                    }
                });
            }

            // Wire Event Checkbox Selection & Batch/Wipe Listeners
            const selectAllEventsCheckbox = container.querySelector('#select-all-events-checkbox');
            const eventCheckboxes = container.querySelectorAll('.event-select-checkbox');
            const selectedEventsCount = container.querySelector('#selected-events-count');

            function updateSelectedEventsCount() {
                const checked = container.querySelectorAll('.event-select-checkbox:checked');
                if (selectedEventsCount) selectedEventsCount.textContent = checked.length;
            }

            if (selectAllEventsCheckbox) {
                selectAllEventsCheckbox.addEventListener('change', () => {
                    eventCheckboxes.forEach(cb => cb.checked = selectAllEventsCheckbox.checked);
                    updateSelectedEventsCount();
                });
            }
            eventCheckboxes.forEach(cb => cb.addEventListener('change', updateSelectedEventsCount));

            // Wire Wipe All Private Events with Double Confirmation
            const wipeEventsBtn = container.querySelector('#admin-wipe-events-btn');
            if (wipeEventsBtn) {
                wipeEventsBtn.addEventListener('click', async () => {
                    if (confirmDoubleDelete('ALL Private Event Inquiries in the entire database')) {
                        try {
                            const r = await fetch('/api/admin/private-events', { method: 'DELETE', headers: getAuthHeaders() });
                            if (r.ok) {
                                showToast('All private event inquiries wiped successfully.');
                                loadInlineReservations();
                            } else {
                                const err = await r.json();
                                showToast(err.detail || 'Wipe events failed.');
                            }
                        } catch (e) {
                            showToast('Wipe events failed.');
                        }
                    }
                });
            }

            // Wire Delete Selected Private Events with Double Confirmation
            const deleteSelectedEventsBtn = container.querySelector('#admin-delete-selected-events-btn');
            if (deleteSelectedEventsBtn) {
                deleteSelectedEventsBtn.addEventListener('click', async () => {
                    const checked = container.querySelectorAll('.event-select-checkbox:checked');
                    const selectedIds = Array.from(checked).map(cb => cb.dataset.id);
                    if (selectedIds.length === 0) {
                        showToast('Please select at least one private event inquiry to delete.');
                        return;
                    }

                    if (confirmDoubleDelete(`${selectedIds.length} selected private event inquiry/inquiries`)) {
                        try {
                            const r = await fetch('/api/admin/private-events/batch-delete', {
                                method: 'POST',
                                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ ids: selectedIds })
                            });
                            if (r.ok) {
                                const data = await r.json();
                                showToast(data.message || `Deleted ${selectedIds.length} event(s).`);
                                loadInlineReservations();
                            } else {
                                const err = await r.json();
                                showToast(err.detail || 'Batch delete failed.');
                            }
                        } catch (e) {
                            showToast('Batch delete failed.');
                        }
                    }
                });
            }

            // Wire Reservation Status Change Listener
            container.querySelectorAll('.admin-res-status-change').forEach(select => {
                select.addEventListener('change', async () => {
                    const resId = select.dataset.id;
                    const newStatus = select.value;
                    try {
                        const res = await fetch(`/api/admin/reservations/${resId}/status`, {
                            method: 'PATCH',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({ status: newStatus })
                        });
                        if (res.ok) {
                            showToast(`Reservation #${resId} status updated to ${newStatus}`);
                            loadInlineReservations();
                        } else {
                            showToast('Failed to update reservation status');
                        }
                    } catch (err) {
                        showToast(`Reservation #${resId} set to ${newStatus}`);
                    }
                });
            });

            // Wire Reservation Delete Listener with 2-Step Confirmation
            container.querySelectorAll('.admin-res-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const resId = btn.dataset.id;
                    if (confirmDoubleDelete(`table reservation #${resId}`)) {
                        try {
                            const res = await fetch(`/api/admin/reservations/${resId}`, { method: 'DELETE', headers: getAuthHeaders() });
                            if (res.ok) {
                                showToast(`Reservation #${resId} deleted.`);
                                loadInlineReservations();
                            }
                        } catch (err) {
                            showToast(`Reservation #${resId} deleted.`);
                            loadInlineReservations();
                        }
                    }
                });
            });

            // Wire Event Status Change Listener
            container.querySelectorAll('.admin-event-status-change').forEach(select => {
                select.addEventListener('change', async () => {
                    const eventId = select.dataset.id;
                    const newStatus = select.value;
                    try {
                        const res = await fetch(`/api/admin/private-events/${eventId}/status`, {
                            method: 'PATCH',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({ status: newStatus })
                        });
                        if (res.ok) {
                            showToast(`Private Event #${eventId} status updated to ${newStatus}`);
                            loadInlineReservations();
                        } else {
                            showToast('Failed to update event status');
                        }
                    } catch (err) {
                        showToast(`Event #${eventId} set to ${newStatus}`);
                    }
                });
            });

            // Wire Event Delete Listener with 2-Step Confirmation
            container.querySelectorAll('.admin-event-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const eventId = btn.dataset.id;
                    if (confirmDoubleDelete(`private event inquiry #${eventId}`)) {
                        try {
                            const res = await fetch(`/api/admin/private-events/${eventId}`, { method: 'DELETE', headers: getAuthHeaders() });
                            if (res.ok) {
                                showToast(`Private Event #${eventId} deleted.`);
                                loadInlineReservations();
                            }
                        } catch (err) {
                            showToast(`Event #${eventId} deleted.`);
                            loadInlineReservations();
                        }
                    }
                });
            });

        } catch (err) {
            container.innerHTML = '<p style="color: var(--color-secondary); padding: 16px;">Failed to load reservations and event inquiries.</p>';
        }
    }


    async function loadInlineAuditLogs() {
        const container = document.getElementById('inline-audit-content');
        if (!container) return;
        container.innerHTML = '<p style="padding: 16px; color: #94a3b8;">Fetching security audit logs...</p>';
        try {
            const res = await fetch('/api/admin/audit-logs?_t=' + Date.now(), { headers: getAuthHeaders(), cache: 'no-store' });
            if (res.ok) {
                const logs = await res.json();
                if (logs.length === 0) {
                    container.innerHTML = '<p style="padding: 16px; color: #94a3b8;">No security audit log entries recorded yet.</p>';
                } else {
                    const logRows = logs.map(l => {
                        let actionColor = '#38bdf8';
                        if (l.action.includes('LOGIN') || l.action.includes('SUCCESS')) actionColor = '#4ade80';
                        else if (l.action.includes('DELETE') || l.action.includes('WIPE') || l.action.includes('FAILED')) actionColor = '#f87171';
                        else if (l.action.includes('UPDATE') || l.action.includes('STATUS')) actionColor = '#fbbf24';

                        return `
                            <div style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                                <span style="color: #94a3b8; font-size: 0.8rem; min-width: 140px;">${new Date(l.timestamp).toLocaleString()}</span>
                                <span style="background-color: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">IP: ${l.ip_address}</span>
                                <span style="font-weight: 700; color: #f1f5f9;">User: ${l.username}</span>
                                <span style="font-weight: 700; color: ${actionColor}; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px;">${l.action}</span>
                                <span style="color: #cbd5e1; flex: 1;">${l.details || 'N/A'}</span>
                            </div>
                        `;
                    }).join('');
                    container.innerHTML = logRows;
                }
            } else {
                container.innerHTML = '<p style="color: #f87171; padding: 16px;">Failed to load security audit logs (Session expired).</p>';
            }
        } catch (err) {
            container.innerHTML = '<p style="color: #f87171; padding: 16px;">Security audit log retrieval failed.</p>';
        }
    }

    // Check admin session on startup
    checkAdminSession();
});

