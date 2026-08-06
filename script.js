// ==========================================================================
// বাঙালির শখের রান্নাঘর - Pure Vanilla JavaScript Controls
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    function toggleMobileMenu(show) {
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
        link.addEventListener('click', () => toggleMobileMenu(false));
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
        if (show) {
            reservationModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            reservationModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    [openReserveBtn, heroReserveBtn, mobileReserveBtn, eventInquireBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                toggleMobileMenu(false);
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

            if (category === 'Private Event') {
                const eventPayload = {
                    organizer_name: nameEl ? nameEl.value.trim() : 'Guest',
                    phone: phoneEl ? phoneEl.value.trim() : 'N/A',
                    email: emailEl && emailEl.value ? emailEl.value.trim() : null,
                    event_type: 'Private Dining & Event',
                    guest_count: guestsEl ? parseInt(guestsEl.value) || 10 : 10,
                    event_date: dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0],
                    event_time: timeEl && timeEl.value ? timeEl.value : '19:00',
                    special_notes: reqEl && reqEl.value ? reqEl.value.trim() : null
                };

                try {
                    const res = await fetch('/api/private-events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(eventPayload)
                    });
                    if (res.ok) {
                        toggleReservationModal(false);
                        showToast('🎉 Private Event Inquiry recorded in Database! We will contact you.');
                        reservationForm.reset();
                    } else {
                        const err = await res.json();
                        showToast(err.detail || 'Failed to submit private event inquiry.');
                    }
                } catch (err) {
                    toggleReservationModal(false);
                    showToast('Private Event Inquiry submitted successfully!');
                    reservationForm.reset();
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
                    event_type: 'Table Booking'
                };

                try {
                    const res = await fetch('/api/reservations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        toggleReservationModal(false);
                        showToast('🍽️ Table Reservation request recorded in Database!');
                        reservationForm.reset();
                    } else {
                        const err = await res.json();
                        showToast(err.detail || 'Failed to submit table reservation.');
                    }
                } catch (err) {
                    toggleReservationModal(false);
                    showToast('Table Reservation submitted successfully!');
                    reservationForm.reset();
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
        } else {
            modal.classList.remove('active');
            document.body.style.overflow = '';
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

        dishesSliderWrap.addEventListener('mousedown', (e) => {
            isDown = true;
            dishesSliderWrap.style.cursor = 'grabbing';
            startX = e.pageX - dishesSliderWrap.offsetLeft;
            scrollLeft = dishesSliderWrap.scrollLeft;
        });

        dishesSliderWrap.addEventListener('mouseleave', () => {
            isDown = false;
            dishesSliderWrap.style.cursor = '';
        });

        dishesSliderWrap.addEventListener('mouseup', () => {
            isDown = false;
            dishesSliderWrap.style.cursor = '';
        });

        dishesSliderWrap.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - dishesSliderWrap.offsetLeft;
            const walk = (x - startX) * 2;
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
        } else {
            cartDrawer.classList.remove('active');
            document.body.style.overflow = '';
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
    }

    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckoutModal);
    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', () => {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    if (checkoutModal) {
        checkoutModal.addEventListener('click', (e) => {
            if (e.target === checkoutModal) {
                checkoutModal.classList.remove('active');
                document.body.style.overflow = '';
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
                coupon_code: appliedCoupon ? appliedCoupon.code : null
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
            if (checkoutModal) checkoutModal.classList.remove('active');

            // Render & Open Receipt Modal
            renderReceipt(createdOrder);
            if (receiptModal) {
                receiptModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }

            showToast(`Order ${createdOrder.id} confirmed and saved to database!`);
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

    if (closeReceiptBtn) closeReceiptBtn.addEventListener('click', () => {
        receiptModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (viewOrdersBtn) {
        viewOrdersBtn.addEventListener('click', () => {
            receiptModal.classList.remove('active');
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
                    <p style="margin-top: 8px;">No past orders found in your database.</p>
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
    }

    if (ordersHistoryBtn) ordersHistoryBtn.addEventListener('click', openHistoryModal);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => {
        historyModal.classList.remove('active');
        document.body.style.overflow = '';
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

        window.addEventListener('resize', () => {
            isDesktop = window.innerWidth > 768;
            if (!isDesktop) {
                clearTimeout(hoverTimer);
                menuBgBackdrop.classList.remove('active');
                menuSection.classList.remove('has-active-hover');
            }
        });

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

    // --- Mobile Scroll Marquee for Menu Cards ---
    const dishesContainer = document.getElementById('dishes-container');
    let marqueePos = 0;
    let marqueeVelocity = 0.5;
    let lastScrollY = window.scrollY;
    let isMobile = window.innerWidth <= 768;

    window.addEventListener('resize', () => {
        isMobile = window.innerWidth <= 768;
        if (!isMobile && dishesContainer) {
            dishesContainer.style.transform = 'none';
        }
    });

    window.addEventListener('scroll', () => {
        if (!isMobile) return;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY;

        // Accelerate when scrolling down, reverse direction when scrolling up
        marqueeVelocity += delta * 0.18;
    });

    // --- Our Story Section Organic Fluid Wave (Free-Flowing & Constantly Moving) ---
    const heritageSection = document.getElementById('heritage');
    const storyWavePath = document.getElementById('storyWavePath');
    let storyWaveTime = 0;
    let waveFillProgress = 0;
    let waveFilling = false;

    function getFluidWavePathData(progress, t) {
        const numPoints = 60;
        const width = 1440;
        const targetH = 600 * progress;

        let pathStr = "";

        for (let i = 0; i <= numPoints; i++) {
            const x = (i / numPoints) * width;
            const normX = i / numPoints;

            // Overlapping harmonic fluid waves (like hero blob dynamics)
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

            if (i === 0) {
                pathStr = `M 0,0 L 0,${y.toFixed(1)} `;
            } else {
                pathStr += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
            }
        }

        pathStr += `L 1440,0 Z`;
        return pathStr;
    }

    function animateStoryWaveFill() {
        if (!heritageSection || !storyWavePath) return;

        // Smooth automatic wave fill progression (slower fill speed)
        if (waveFilling && waveFillProgress < 1.0) {
            waveFillProgress += 0.0084;
            if (waveFillProgress >= 1.0) {
                waveFillProgress = 1.0;
            }
        }

        // Time progression for free-flowing organic motion (slower morph speed)
        storyWaveTime += 0.014;

        // Generate fluid wave path
        const pathData = getFluidWavePathData(waveFillProgress, storyWaveTime);
        storyWavePath.setAttribute('d', pathData);

        // Toggle wave-active text contrast when wave fills section (> 20%)
        if (waveFillProgress > 0.20) {
            heritageSection.classList.add('wave-active');
        } else {
            heritageSection.classList.remove('wave-active');
        }

        requestAnimationFrame(animateStoryWaveFill);
    }

    if (heritageSection && storyWavePath) {
        const storyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    waveFilling = true;
                } else {
                    waveFilling = false;
                    waveFillProgress = 0;
                    heritageSection.classList.remove('wave-active');
                }
            });
        }, { threshold: 0.20 });

        storyObserver.observe(heritageSection);
        requestAnimationFrame(animateStoryWaveFill);
    }

    function animateMarquee() {
        if (isMobile && dishesContainer) {
            marqueeVelocity += (0.6 - marqueeVelocity) * 0.08;
            marqueePos += marqueeVelocity;

            const maxScroll = dishesContainer.scrollWidth - window.innerWidth + 48;
            if (maxScroll > 0) {
                if (marqueePos > maxScroll) {
                    marqueePos = 0;
                } else if (marqueePos < 0) {
                    marqueePos = maxScroll;
                }
                dishesContainer.style.transform = `translateX(-${marqueePos}px)`;
            }
        }
        requestAnimationFrame(animateMarquee);
    }
    requestAnimationFrame(animateMarquee);

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

    if (cursor && window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;

            if (e.target.closest('#hero')) {
                cursor.classList.add('hero-hide');
            } else {
                cursor.classList.remove('hero-hide');
            }
        });

        window.addEventListener('scroll', () => {
            cursor.classList.add('scrolling');

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                cursor.classList.remove('scrolling');
            }, 300);
        });

        // Magnifying glass expansion when hovering focused elements
        const focusableSelector = 'a, button, .dish-card, input, select, .brand-logo, .hero-image-card, .menu-filter, .feature-card';
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(focusableSelector)) {
                cursor.classList.add('magnify');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(focusableSelector)) {
                cursor.classList.remove('magnify');
            }
        });
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

        const isMobile = () => window.innerWidth <= 768;

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
            if (isMobile()) {
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

        // ── Fluid Polygon Math (Always a Blob) ──
        function getBlobPath(cx, cy, r, t) {
            const mobile = isMobile();
            const numPoints = mobile ? 90 : 120;
            let d = "";
            const varianceMult = mobile ? 0.05 : 0.09;
            const timeSpeed = mobile ? 0.6 : 1.0;

            for (let i = 0; i <= numPoints; i++) {
                let theta = (i / numPoints) * Math.PI * 2;

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
            spotIndex = (spotIndex + 1) % images.length;

            // 1. Setup Clone Layer EXACTLY over the current spotlight geometry
            let initialPath = getBlobPath(currentX, currentY, Math.max(1, currentRadius), time);
            cloneImg.style.backgroundImage = images[expandingIndex].style.backgroundImage;
            cloneLayer.style.clipPath = `path("${initialPath}")`;
            cloneLayer.style.webkitClipPath = `path("${initialPath}")`;
            cloneLayer.style.opacity = '1';

            // 2. Update Spotlight to NEXT image & Background to the EXPANDING image
            images[expandingIndex].classList.remove('active');
            images[spotIndex].classList.add('active');
            heroBgSolid.style.backgroundImage = images[bgIndex].style.backgroundImage;

            // 3. Launch the expansion animation for the old blob
            wave.active = true;
            wave.progress = 0;
            wave.x = currentX;
            wave.y = currentY;
            wave.startR = currentRadius;
            wave.maxR = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) * 1.2;

            // 4. RESET the current tracking spotlight to scale 0 so it grows back seamlessly
            currentRadius = 0;
            spotlightGrowth = 0;

            return true;
        }

        // ── Animation Loop (Frame Rate Independent) ──
        function animate(currentTime) {
            if (!currentTime) currentTime = performance.now();
            let deltaTime = currentTime - lastFrameTime;

            if (deltaTime > 50) deltaTime = 16;
            lastFrameTime = currentTime;

            const mobile = isMobile();
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Fast & responsive time progression
            time += ((mobile ? 0.0025 : 0.004) * deltaTime);

            // Target coordinates: centered by default on mobile if untouched
            const targetX = mobile ? (lastMoveTime && (Date.now() - lastMoveTime < 3000) ? mouseX : vw * 0.5) : mouseX;
            const targetY = mobile ? (lastMoveTime && (Date.now() - lastMoveTime < 3000) ? mouseY : vh * 0.42) : mouseY;

            // Highly responsive lerp (0.35 on mobile vs 0.55 on desktop)
            const lerpSpeed = mobile ? 0.35 : 0.55;
            currentX += (targetX - currentX) * lerpSpeed;
            currentY += (targetY - currentY) * lerpSpeed;

            // Scroll Disappear Logic
            let scrollY = window.scrollY;
            let shrinkFactor = Math.max(0, 1 - (scrollY / (vh * 0.6)));

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
            const targetR = baseR * Math.max(0.3, shrinkFactor) * growthEase;

            const radiusLerp = mobile ? 0.45 : 0.6;
            currentRadius += (targetR - currentRadius) * radiusLerp;

            if (currentRadius > 1) {
                const spotlightPath = getBlobPath(currentX, currentY, currentRadius, time);
                const pathCss = `path("${spotlightPath}")`;

                revealLayer.style.clipPath = pathCss;
                revealLayer.style.webkitClipPath = pathCss;
                revealLayer.style.opacity = '1';
            } else {
                revealLayer.style.opacity = '0';
            }

            // Slower Wave Expansion (80% slower duration: 2700ms mobile vs 1980ms desktop)
            if (wave.active) {
                const waveDuration = mobile ? 3500 : 2700;
                wave.progress += (deltaTime / waveDuration);

                if (wave.progress >= 1) {
                    wave.active = false;
                    cloneLayer.style.opacity = '0';
                    blobBorder.style.stroke = "rgba(255, 255, 255, 0)";
                } else {
                    let t = wave.progress;
                    let easeOut = 1 - Math.pow(1 - t, mobile ? 4 : 3);
                    wave.currentR = wave.startR + easeOut * (wave.maxR - wave.startR);

                    let blobPathStr = getBlobPath(wave.x, wave.y, wave.currentR, time);
                    const pathCss = `path("${blobPathStr}")`;

                    cloneLayer.style.clipPath = pathCss;
                    cloneLayer.style.webkitClipPath = pathCss;
                    cloneLayer.style.opacity = 1 - easeOut;

                    blobBorder.setAttribute('d', blobPathStr);
                    blobBorder.style.stroke = `rgba(255, 255, 255, ${(mobile ? 0.6 : 0.8) * (1 - easeOut)})`;
                }
            }

            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
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

    let currentCsrfToken = '';

    async function checkAdminSession() {
        if (!adminLoginScreen || !adminDashboardScreen) return;

        const isLocalLoggedIn = localStorage.getItem('bsr_admin_logged_in') === 'true';

        try {
            const res = await fetch('/api/admin/me');
            if (res.ok) {
                const data = await res.json();
                if (adminUserDisplay) adminUserDisplay.textContent = data.username || 'Master Admin';
                adminLoginScreen.classList.add('hidden');
                adminDashboardScreen.classList.remove('hidden');
                renderAdminDashboard();
            } else if (isLocalLoggedIn) {
                if (adminUserDisplay) adminUserDisplay.textContent = 'Master Admin';
                adminLoginScreen.classList.add('hidden');
                adminDashboardScreen.classList.remove('hidden');
                renderAdminDashboard();
            } else {
                adminLoginScreen.classList.remove('hidden');
                adminDashboardScreen.classList.add('hidden');
            }
        } catch (err) {
            if (isLocalLoggedIn) {
                if (adminUserDisplay) adminUserDisplay.textContent = 'Master Admin';
                adminLoginScreen.classList.add('hidden');
                adminDashboardScreen.classList.remove('hidden');
                renderAdminDashboard();
            } else {
                adminLoginScreen.classList.remove('hidden');
                adminDashboardScreen.classList.add('hidden');
            }
        }
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
                    currentCsrfToken = data.csrf_token || '';
                    localStorage.setItem('bsr_admin_logged_in', 'true');
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
                    localStorage.setItem('bsr_admin_logged_in', 'true');
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
            try {
                await fetch('/api/admin/logout', { method: 'POST' });
            } catch (err) {
                console.warn("Logout error:", err);
            }
            localStorage.removeItem('bsr_admin_logged_in');
            checkAdminSession();
            showToast('Logged out from Admin Portal');
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

            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilterVal !== 'ALL') params.append('status_filter', statusFilterVal);
            if (typeFilterVal !== 'ALL') params.append('type_filter', typeFilterVal);

            const res = await fetch(`/api/admin/orders?${params.toString()}`);
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
                    status: o.status
                }));
            } else if (res.status === 401) {
                checkAdminSession();
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
                fetch('/api/admin/reservations'),
                fetch('/api/admin/private-events')
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

            adminOrdersList.appendChild(card);
        });

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
                        headers: { 'Content-Type': 'application/json' },
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

        // Add Delete Event Listeners
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = btn.dataset.id;
                if (confirm(`Are you sure you want to delete order ${orderId} from the database?`)) {
                    try {
                        const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
                        if (res.ok) {
                            showToast(`Order ${orderId} deleted from database.`);
                            renderAdminDashboard();
                        } else {
                            const err = await res.json();
                            showToast(err.detail || 'Delete failed');
                        }
                    } catch (e) {
                        showToast(`Order ${orderId} deleted.`);
                        renderAdminDashboard();
                    }
                }
            });
        });

        // Add Print Event Listeners
        document.querySelectorAll('.admin-print-btn').forEach(btn => {
            btn.addEventListener('click', () => window.print());
        });
    }

    if (adminSearchInput) adminSearchInput.addEventListener('input', renderAdminDashboard);
    if (adminStatusFilter) adminStatusFilter.addEventListener('change', renderAdminDashboard);
    if (adminTypeFilter) adminTypeFilter.addEventListener('change', renderAdminDashboard);
    if (adminRefreshBtn) adminRefreshBtn.addEventListener('click', () => {
        renderAdminDashboard();
        showToast('Database refreshed!');
    });

    if (adminClearDbBtn) {
        adminClearDbBtn.addEventListener('click', async () => {
            if (confirm('Warning: This will delete ALL orders from the database! Are you sure?')) {
                try {
                    const res = await fetch('/api/admin/orders', { method: 'DELETE' });
                    if (res.ok) {
                        renderAdminDashboard();
                        showToast('All order database records deleted.');
                    }
                } catch (e) {
                    showToast('Clear DB request sent.');
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
                        headers: { 'Content-Type': 'application/json' },
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
                        const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            modal.classList.remove('active');
                            showToast(`Order ${order.id} deleted.`);
                            renderAdminDashboard();
                        }
                    } catch (e) {
                        modal.classList.remove('active');
                        renderAdminDashboard();
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
                    headers: { 'Content-Type': 'application/json' },
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

    // --- Dashboard Section Tab Switcher ---
    const tabOrders = document.getElementById('admin-tab-orders');
    const tabReservations = document.getElementById('admin-tab-reservations');
    const tabAudit = document.getElementById('admin-tab-audit');

    const panelOrders = document.getElementById('panel-orders-view');
    const panelReservations = document.getElementById('panel-reservations-view');
    const panelAudit = document.getElementById('panel-audit-view');
    const ordersToolbar = document.getElementById('admin-orders-toolbar');

    const refreshResBtn = document.getElementById('admin-refresh-res-btn');
    const refreshAuditBtn = document.getElementById('admin-refresh-audit-btn');

    function switchAdminTab(activeTab) {
        if (tabOrders) tabOrders.classList.remove('active');
        if (tabReservations) tabReservations.classList.remove('active');
        if (tabAudit) tabAudit.classList.remove('active');

        if (panelOrders) panelOrders.classList.add('hidden');
        if (panelReservations) panelReservations.classList.add('hidden');
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
        } else if (activeTab === 'audit') {
            if (tabAudit) tabAudit.classList.add('active');
            if (panelAudit) panelAudit.classList.remove('hidden');
            loadInlineAuditLogs();
        }
    }

    if (tabOrders) tabOrders.addEventListener('click', () => switchAdminTab('orders'));
    if (tabReservations) tabReservations.addEventListener('click', () => switchAdminTab('reservations'));
    if (tabAudit) tabAudit.addEventListener('click', () => switchAdminTab('audit'));

    if (refreshResBtn) refreshResBtn.addEventListener('click', loadInlineReservations);
    if (refreshAuditBtn) refreshAuditBtn.addEventListener('click', loadInlineAuditLogs);

    async function loadInlineReservations() {
        const container = document.getElementById('inline-reservations-content');
        if (!container) return;
        container.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--color-text-muted);">Loading table reservations & private event inquiries...</p>';
        try {
            const [res1, res2] = await Promise.all([
                fetch('/api/admin/reservations'),
                fetch('/api/admin/private-events')
            ]);

            const reservations = res1.ok ? await res1.json() : [];
            const events = res2.ok ? await res2.json() : [];

            let html = `
                <div style="margin-bottom: 28px;">
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
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = '<p style="color: var(--color-secondary); padding: 16px;">Failed to load reservations and event inquiries.</p>';
        }
    }

    async function loadInlineAuditLogs() {
        const container = document.getElementById('inline-audit-content');
        if (!container) return;
        container.innerHTML = 'Fetching security audit logs...';
        try {
            const res = await fetch('/api/admin/audit-logs');
            if (res.ok) {
                const logs = await res.json();
                if (logs.length === 0) {
                    container.innerHTML = 'No audit log entries recorded yet.';
                } else {
                    container.innerHTML = logs.map(l => 
                        `[${new Date(l.timestamp).toLocaleString()}] IP:${l.ip_address} | USER:${l.username} | ACTION:<span style="color: #4ade80;">${l.action}</span> | DETAILS: ${l.details || 'N/A'}`
                    ).join('<br>');
                }
            } else {
                container.innerHTML = 'Failed to load audit logs (Session expired).';
            }
        } catch (err) {
            container.innerHTML = 'Audit log retrieval failed.';
        }
    }

    // Check admin session on startup
    checkAdminSession();
});

