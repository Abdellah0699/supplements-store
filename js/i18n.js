/**
 * i18n.js
 * ---------------------------------------------------------
 * Small translation engine for the site's own UI text (nav,
 * buttons, labels, headings, messages). Product names and
 * descriptions are intentionally left untranslated (client's
 * choice) and product/category *data* stays in products.json.
 *
 * How it works:
 *  - Static HTML text: tag an element with data-i18n="some.key"
 *    and its textContent is set on load.
 *  - Static HTML attributes: data-i18n-placeholder="key" sets the
 *    placeholder attribute (same pattern for any attribute: the
 *    part after "data-i18n-" is the attribute name).
 *  - Dynamic JS-generated text (product cards, tabs, validation
 *    messages, etc.): call I18N.t('some.key') directly.
 *  - Switching language reloads the page so every static AND
 *    dynamic string re-renders correctly with no mixed-language
 *    state; the choice is remembered via localStorage.
 * ---------------------------------------------------------
 */

const I18N = (() => {
  const STORAGE_KEY = 'siteLang';

  const LANGS = [
    { code: 'en', dir: 'ltr', autonym: 'English' },
    { code: 'fr', dir: 'ltr', autonym: 'Français' },
    { code: 'ar', dir: 'rtl', autonym: 'العربية' },
  ];

  const DICT = {
    en: {
      nav: { home: 'Home', categories: 'Categories', products: 'Products', search: 'Search' },
      header: {
        searchPlaceholder: 'Search products...',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
        homepageLabel: 'Homepage',
        logoAlt: 'Store logo',
        langSwitchAria: 'Switch language',
      },
      hero: {
        badge: 'Delivered across Algeria',
        title: 'Quality supplements for your goals',
        shopNow: 'Shop Now',
        exploreCategories: 'Explore Categories',
      },
      sections: {
        shopByCategory: 'Shop by Category',
        popularProducts: 'Popular Products',
        seeAll: 'See all',
        recommendedForYou: 'Recommended for You',
        whyShopWithUs: 'Why Shop With Us',
      },
      perks: {
        qualityTitle: 'Quality Products',
        qualityText: 'Carefully selected supplements.',
        deliveryTitle: 'Fast Delivery',
        deliveryText: 'Delivery across Algeria.',
        orderingTitle: 'Easy Ordering',
        orderingText: 'Order directly from the product page.',
        supportTitle: 'Customer Support',
        supportText: "We're here to help.",
      },
      cta: {
        title: 'Not sure where to start?',
        text: 'Browse products by category and order directly from the product page.',
      },
      footer: {
        navigate: 'Navigate',
        categoriesHeading: 'Categories',
        contact: 'Contact',
        phoneLabel: 'Phone:',
        rights: 'All rights reserved.',
        storeName: 'Your Supplement Store',
      },
      breadcrumb: { category: 'Category', product: 'Product' },
      common: {
        noProductsFound: 'No products found.',
        nothingHereYet: 'Nothing here yet',
        couldntLoadProducts: "Couldn't load products",
        somethingWentWrong: 'Something went wrong. Please try again.',
        noFeaturedProducts: 'No featured products yet.',
        noCategoryProducts: 'No products available in this category yet.',
        couldntLoadCategories: "Couldn't load categories.",
        backToHomepage: 'Back to homepage',
        outOfStock: 'Out of stock',
        inStock: 'In stock',
      },
      product: {
        notFoundTitle: 'Product not found',
        notFoundText: 'This product may have been removed or the link is incorrect.',
        flavorLabel: 'Flavor',
        tabsDescription: 'Description',
        tabsBenefits: 'Benefits',
        tabsUsage: 'Usage',
        youMayAlsoLike: 'You May Also Like',
      },
      orderForm: {
        title: 'Order Now',
        quantityLabel: 'Quantity',
        unitPriceLine: 'at {price} each',
        yourInformation: 'Your information',
        firstName: 'First name',
        phoneNumber: 'Phone number',
        deliveryMethod: 'Delivery method',
        homeDelivery: 'Home Delivery',
        homeDeliveryDesc: 'Delivered to your address',
        pickupPoint: 'Pick Up Point',
        pickupPointDesc: 'Collect it yourself',
        deliveryLocation: 'Delivery location',
        wilaya: 'Wilaya',
        commune: 'Commune',
        loadingWilayas: 'Loading wilayas...',
        couldntLoadWilayas: "Couldn't load wilayas",
        selectWilaya: 'Select Wilaya',
        selectWilayaFirst: 'Select Wilaya first',
        selectCommune: 'Select Commune',
        address: 'Address',
        addressPlaceholder: 'Street, building, neighborhood...',
        orderSummary: 'Order summary',
        subtotal: 'Subtotal',
        delivery: 'Delivery',
        total: 'Total',
        placeOrder: 'Place Order',
        placingOrder: 'Placing order...',
        submitNote: "We'll call you to confirm before shipping. Payment on delivery.",
        selectWilayaShort: 'Select wilaya',
        free: 'Free',
        outOfStockNotice: 'This product is currently out of stock. Check back soon.',
        errorSubmit: 'Something went wrong sending your order. Please try again.',
      },
      validation: {
        firstName: 'Please enter your first name.',
        phone: 'Enter a valid Algerian number, e.g. 0555 12 34 56.',
        wilaya: 'Please select your wilaya.',
        commune: 'Please select your commune.',
        address: 'Please enter a delivery address.',
      },
      category: {
        notFoundTitle: 'Category not found',
        notFoundText: 'This category may have been removed or the link is incorrect.',
        sortBy: 'Sort by',
        sortFeatured: 'Featured',
        sortPriceAsc: 'Price: Low to High',
        sortPriceDesc: 'Price: High to Low',
        sortNameAsc: 'Name: A-Z',
        all: 'All',
        productCount: { one: '{n} product', other: '{n} products' },
      },
      search: {
        title: 'Search',
        button: 'Search',
        promptTitle: 'Search for a product',
        promptText: 'Try "{cat1}", "{cat2}" or a category name.',
        searching: 'Searching...',
        results: { one: '{n} result for "{query}"', other: '{n} results for "{query}"' },
        noResults: 'No search results found. Try a different keyword.',
      },
      orderSuccess: {
        title: 'Order Received',
        thankYou: 'Thank you for your order.',
        willContact: 'We will contact you on your phone number to confirm the order.',
        continueShopping: 'Continue Shopping',
        orderRefPrefix: 'Order #',
      },
      categoryNames: {
        protein: 'Protein',
        creatine: 'Creatine',
        vitamins: 'Vitamins',
        minerals: 'Minerals',
        'pre-workout': 'Pre-Workout',
        'mass-gainers': 'Mass Gainers',
        'amino-acids': 'Amino Acids',
        'fat-burners': 'Fat Burners',
        wellness: 'Health & Wellness',
        accessories: 'Accessories',
      },
      meta: {
        homeTitle: 'Your Supplement Store — Quality Supplements, Delivered in Algeria',
        homeDescription:
          'Protein, creatine, vitamins and more. Order directly from the product page, pay on delivery, anywhere in Algeria.',
      },
    },

    fr: {
      nav: { home: 'Accueil', categories: 'Catégories', products: 'Produits', search: 'Recherche' },
      header: {
        searchPlaceholder: 'Rechercher des produits...',
        openMenu: 'Ouvrir le menu',
        closeMenu: 'Fermer le menu',
        homepageLabel: 'Accueil',
        logoAlt: 'Logo de la boutique',
        langSwitchAria: 'Changer de langue',
      },
      hero: {
        badge: "Livraison dans toute l'Algérie",
        title: 'Des compléments de qualité pour vos objectifs',
        shopNow: 'Acheter maintenant',
        exploreCategories: 'Explorer les catégories',
      },
      sections: {
        shopByCategory: 'Acheter par catégorie',
        popularProducts: 'Produits populaires',
        seeAll: 'Voir tout',
        recommendedForYou: 'Recommandé pour vous',
        whyShopWithUs: 'Pourquoi nous choisir',
      },
      perks: {
        qualityTitle: 'Produits de qualité',
        qualityText: 'Compléments soigneusement sélectionnés.',
        deliveryTitle: 'Livraison rapide',
        deliveryText: "Livraison dans toute l'Algérie.",
        orderingTitle: 'Commande facile',
        orderingText: 'Commandez directement depuis la fiche produit.',
        supportTitle: 'Service client',
        supportText: 'Nous sommes là pour vous aider.',
      },
      cta: {
        title: 'Vous ne savez pas par où commencer ?',
        text: 'Parcourez les produits par catégorie et commandez directement depuis la fiche produit.',
      },
      footer: {
        navigate: 'Navigation',
        categoriesHeading: 'Catégories',
        contact: 'Contact',
        phoneLabel: 'Téléphone :',
        rights: 'Tous droits réservés.',
        storeName: 'Your Supplement Store',
      },
      breadcrumb: { category: 'Catégorie', product: 'Produit' },
      common: {
        noProductsFound: 'Aucun produit trouvé.',
        nothingHereYet: 'Rien à afficher pour le moment',
        couldntLoadProducts: 'Impossible de charger les produits',
        somethingWentWrong: 'Une erreur est survenue. Veuillez réessayer.',
        noFeaturedProducts: 'Aucun produit recommandé pour le moment.',
        noCategoryProducts: 'Aucun produit disponible dans cette catégorie pour le moment.',
        couldntLoadCategories: 'Impossible de charger les catégories.',
        backToHomepage: "Retour à l'accueil",
        outOfStock: 'Rupture de stock',
        inStock: 'En stock',
      },
      product: {
        notFoundTitle: 'Produit introuvable',
        notFoundText: "Ce produit a peut-être été supprimé ou le lien est incorrect.",
        flavorLabel: 'Parfum',
        tabsDescription: 'Description',
        tabsBenefits: 'Bienfaits',
        tabsUsage: 'Utilisation',
        youMayAlsoLike: 'Vous aimerez aussi',
      },
      orderForm: {
        title: 'Commander',
        quantityLabel: 'Quantité',
        unitPriceLine: "à {price} l'unité",
        yourInformation: 'Vos informations',
        firstName: 'Prénom',
        phoneNumber: 'Numéro de téléphone',
        deliveryMethod: 'Mode de livraison',
        homeDelivery: 'Livraison à domicile',
        homeDeliveryDesc: 'Livré à votre adresse',
        pickupPoint: 'Point de retrait',
        pickupPointDesc: 'À récupérer vous-même',
        deliveryLocation: 'Lieu de livraison',
        wilaya: 'Wilaya',
        commune: 'Commune',
        loadingWilayas: 'Chargement des wilayas...',
        couldntLoadWilayas: 'Impossible de charger les wilayas',
        selectWilaya: 'Sélectionnez une wilaya',
        selectWilayaFirst: "Sélectionnez d'abord une wilaya",
        selectCommune: 'Sélectionnez une commune',
        address: 'Adresse',
        addressPlaceholder: 'Rue, bâtiment, quartier...',
        orderSummary: 'Récapitulatif de la commande',
        subtotal: 'Sous-total',
        delivery: 'Livraison',
        total: 'Total',
        placeOrder: 'Passer la commande',
        placingOrder: 'Envoi de la commande...',
        submitNote: "Nous vous appellerons pour confirmer avant l'expédition. Paiement à la livraison.",
        selectWilayaShort: 'Sélectionnez une wilaya',
        free: 'Gratuit',
        outOfStockNotice: 'Ce produit est actuellement en rupture de stock. Revenez bientôt.',
        errorSubmit: "Une erreur est survenue lors de l'envoi de votre commande. Veuillez réessayer.",
      },
      validation: {
        firstName: 'Veuillez entrer votre prénom.',
        phone: 'Entrez un numéro algérien valide, ex. 0555 12 34 56.',
        wilaya: 'Veuillez sélectionner votre wilaya.',
        commune: 'Veuillez sélectionner votre commune.',
        address: 'Veuillez entrer une adresse de livraison.',
      },
      category: {
        notFoundTitle: 'Catégorie introuvable',
        notFoundText: 'Cette catégorie a peut-être été supprimée ou le lien est incorrect.',
        sortBy: 'Trier par',
        sortFeatured: 'En vedette',
        sortPriceAsc: 'Prix croissant',
        sortPriceDesc: 'Prix décroissant',
        sortNameAsc: 'Nom : A-Z',
        all: 'Tout',
        productCount: { one: '{n} produit', other: '{n} produits' },
      },
      search: {
        title: 'Recherche',
        button: 'Rechercher',
        promptTitle: 'Recherchez un produit',
        promptText: 'Essayez « {cat1} », « {cat2} » ou le nom d\'une catégorie.',
        searching: 'Recherche en cours...',
        results: { one: '{n} résultat pour « {query} »', other: '{n} résultats pour « {query} »' },
        noResults: 'Aucun résultat trouvé. Essayez un autre mot-clé.',
      },
      orderSuccess: {
        title: 'Commande reçue',
        thankYou: 'Merci pour votre commande.',
        willContact: 'Nous vous contacterons par téléphone pour confirmer la commande.',
        continueShopping: 'Continuer mes achats',
        orderRefPrefix: 'Commande n°',
      },
      categoryNames: {
        protein: 'Protéines',
        creatine: 'Créatine',
        vitamins: 'Vitamines',
        minerals: 'Minéraux',
        'pre-workout': 'Pré-entraînement',
        'mass-gainers': 'Prise de masse',
        'amino-acids': 'Acides aminés',
        'fat-burners': 'Brûleurs de graisse',
        wellness: 'Santé & bien-être',
        accessories: 'Accessoires',
      },
      meta: {
        homeTitle: 'Your Supplement Store — Compléments de qualité, livrés en Algérie',
        homeDescription:
          'Protéines, créatine, vitamines et plus encore. Commandez directement depuis la fiche produit, paiement à la livraison, partout en Algérie.',
      },
    },

    ar: {
      nav: { home: 'الرئيسية', categories: 'الفئات', products: 'المنتجات', search: 'بحث' },
      header: {
        searchPlaceholder: 'ابحث عن المنتجات...',
        openMenu: 'فتح القائمة',
        closeMenu: 'إغلاق القائمة',
        homepageLabel: 'الصفحة الرئيسية',
        logoAlt: 'شعار المتجر',
        langSwitchAria: 'تغيير اللغة',
      },
      hero: {
        badge: 'التوصيل إلى جميع الولايات',
        title: 'مكملات غذائية عالية الجودة لتحقيق أهدافك',
        shopNow: 'تسوق الآن',
        exploreCategories: 'استعراض الفئات',
      },
      sections: {
        shopByCategory: 'تسوق حسب الفئة',
        popularProducts: 'المنتجات الأكثر طلبًا',
        seeAll: 'عرض الكل',
        recommendedForYou: 'نوصي لك بـ',
        whyShopWithUs: 'لماذا تختارنا',
      },
      perks: {
        qualityTitle: 'منتجات عالية الجودة',
        qualityText: 'مكملات مختارة بعناية.',
        deliveryTitle: 'توصيل سريع',
        deliveryText: 'توصيل إلى جميع الولايات.',
        orderingTitle: 'طلب سهل',
        orderingText: 'اطلب مباشرة من صفحة المنتج.',
        supportTitle: 'خدمة العملاء',
        supportText: 'نحن هنا لمساعدتك.',
      },
      cta: {
        title: 'لا تعرف من أين تبدأ؟',
        text: 'تصفح المنتجات حسب الفئة واطلب مباشرة من صفحة المنتج.',
      },
      footer: {
        navigate: 'روابط',
        categoriesHeading: 'الفئات',
        contact: 'تواصل معنا',
        phoneLabel: 'الهاتف:',
        rights: 'جميع الحقوق محفوظة.',
        storeName: 'Your Supplement Store',
      },
      breadcrumb: { category: 'الفئة', product: 'المنتج' },
      common: {
        noProductsFound: 'لم يتم العثور على منتجات.',
        nothingHereYet: 'لا يوجد شيء هنا بعد',
        couldntLoadProducts: 'تعذر تحميل المنتجات',
        somethingWentWrong: 'حدث خطأ ما. حاول مرة أخرى.',
        noFeaturedProducts: 'لا توجد منتجات مميزة حاليًا.',
        noCategoryProducts: 'لا توجد منتجات متاحة في هذه الفئة حاليًا.',
        couldntLoadCategories: 'تعذر تحميل الفئات.',
        backToHomepage: 'العودة إلى الصفحة الرئيسية',
        outOfStock: 'غير متوفر',
        inStock: 'متوفر',
      },
      product: {
        notFoundTitle: 'المنتج غير موجود',
        notFoundText: 'ربما تم حذف هذا المنتج أو أن الرابط غير صحيح.',
        flavorLabel: 'النكهة',
        tabsDescription: 'الوصف',
        tabsBenefits: 'الفوائد',
        tabsUsage: 'طريقة الاستخدام',
        youMayAlsoLike: 'قد يعجبك أيضًا',
      },
      orderForm: {
        title: 'اطلب الآن',
        quantityLabel: 'الكمية',
        unitPriceLine: 'بسعر {price} للقطعة',
        yourInformation: 'معلوماتك',
        firstName: 'الاسم الأول',
        phoneNumber: 'رقم الهاتف',
        deliveryMethod: 'طريقة التوصيل',
        homeDelivery: 'التوصيل إلى المنزل',
        homeDeliveryDesc: 'يتم التوصيل إلى عنوانك',
        pickupPoint: 'نقطة استلام',
        pickupPointDesc: 'استلام بنفسك',
        deliveryLocation: 'مكان التوصيل',
        wilaya: 'الولاية',
        commune: 'البلدية',
        loadingWilayas: 'جارٍ تحميل الولايات...',
        couldntLoadWilayas: 'تعذر تحميل الولايات',
        selectWilaya: 'اختر الولاية',
        selectWilayaFirst: 'اختر الولاية أولاً',
        selectCommune: 'اختر البلدية',
        address: 'العنوان',
        addressPlaceholder: 'الشارع، البناية، الحي...',
        orderSummary: 'ملخص الطلب',
        subtotal: 'المجموع الفرعي',
        delivery: 'التوصيل',
        total: 'المجموع',
        placeOrder: 'تأكيد الطلب',
        placingOrder: 'جارٍ إرسال الطلب...',
        submitNote: 'سنتصل بك لتأكيد الطلب قبل الشحن. الدفع عند الاستلام.',
        selectWilayaShort: 'اختر الولاية',
        free: 'مجاني',
        outOfStockNotice: 'هذا المنتج غير متوفر حاليًا. تحقق مرة أخرى قريبًا.',
        errorSubmit: 'حدث خطأ أثناء إرسال طلبك. حاول مرة أخرى.',
      },
      validation: {
        firstName: 'يرجى إدخال اسمك الأول.',
        phone: 'أدخل رقم هاتف جزائري صحيح، مثال: 0555 12 34 56.',
        wilaya: 'يرجى اختيار الولاية.',
        commune: 'يرجى اختيار البلدية.',
        address: 'يرجى إدخال عنوان التوصيل.',
      },
      category: {
        notFoundTitle: 'الفئة غير موجودة',
        notFoundText: 'ربما تم حذف هذه الفئة أو أن الرابط غير صحيح.',
        sortBy: 'ترتيب حسب',
        sortFeatured: 'مميز',
        sortPriceAsc: 'السعر: من الأقل إلى الأعلى',
        sortPriceDesc: 'السعر: من الأعلى إلى الأقل',
        sortNameAsc: 'الاسم: أ-ي',
        all: 'الكل',
        productCount: { one: 'منتج واحد', two: 'منتجان', other: '{n} منتجات' },
      },
      search: {
        title: 'بحث',
        button: 'بحث',
        promptTitle: 'ابحث عن منتج',
        promptText: 'جرّب "{cat1}"، "{cat2}" أو اسم إحدى الفئات.',
        searching: 'جارٍ البحث...',
        results: {
          one: 'نتيجة واحدة لـ "{query}"',
          two: 'نتيجتان لـ "{query}"',
          other: '{n} نتائج لـ "{query}"',
        },
        noResults: 'لم يتم العثور على نتائج. جرّب كلمة مختلفة.',
      },
      orderSuccess: {
        title: 'تم استلام الطلب',
        thankYou: 'شكرًا لطلبك.',
        willContact: 'سنتصل بك على رقم هاتفك لتأكيد الطلب.',
        continueShopping: 'متابعة التسوق',
        orderRefPrefix: 'رقم الطلب #',
      },
      categoryNames: {
        protein: 'البروتين',
        creatine: 'الكرياتين',
        vitamins: 'الفيتامينات',
        minerals: 'المعادن',
        'pre-workout': 'ما قبل التمرين',
        'mass-gainers': 'زيادة الكتلة العضلية',
        'amino-acids': 'الأحماض الأمينية',
        'fat-burners': 'حارقات الدهون',
        wellness: 'الصحة والعافية',
        accessories: 'الإكسسوارات',
      },
      meta: {
        homeTitle: 'Your Supplement Store — مكملات غذائية عالية الجودة، توصيل في الجزائر',
        homeDescription:
          'بروتين، كرياتين، فيتامينات والمزيد. اطلب مباشرة من صفحة المنتج، والدفع عند الاستلام، في جميع أنحاء الجزائر.',
      },
    },
  };

  function getLang() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      saved = null;
    }
    return LANGS.some((l) => l.code === saved) ? saved : 'en';
  }

  function getLangMeta(code) {
    return LANGS.find((l) => l.code === code) || LANGS[0];
  }

  function resolvePath(dict, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return Object.keys(vars).reduce(
      (acc, key) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), vars[key]),
      str
    );
  }

  /** Translate a key, e.g. I18N.t('nav.home') or I18N.t('orderForm.unitPriceLine', {price: '8,500 DA'}) */
  function t(key, vars) {
    const lang = getLang();
    let value = resolvePath(DICT[lang], key);
    if (value === undefined) value = resolvePath(DICT.en, key);
    if (value === undefined || typeof value === 'object') return key;
    return interpolate(value, vars);
  }

  /** Pluralized translate, e.g. I18N.plural('category.productCount', 3) */
  function plural(baseKey, n, vars) {
    const lang = getLang();
    const group = resolvePath(DICT[lang], baseKey) || resolvePath(DICT.en, baseKey) || {};
    let suffix = 'other';
    if (n === 1 && group.one !== undefined) suffix = 'one';
    else if (n === 2 && group.two !== undefined) suffix = 'two';
    return t(`${baseKey}.${suffix}`, { n, ...vars });
  }

  /** Translated category display name, falling back to the raw JSON name. */
  function categoryName(category) {
    if (!category) return '';
    const lang = getLang();
    const translated =
      resolvePath(DICT[lang], `categoryNames.${category.id}`) ||
      resolvePath(DICT.en, `categoryNames.${category.id}`);
    return translated || category.name;
  }

  function applyStaticTranslations(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    scope.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.indexOf('data-i18n-') === 0) {
          const targetAttr = attr.name.slice('data-i18n-'.length);
          el.setAttribute(targetAttr, t(attr.value));
        }
      }
    });
  }

  function updateDocumentDirection() {
    const meta = getLangMeta(getLang());
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }

  function updateLangSwitcherButtons() {
    const currentIndex = LANGS.findIndex((l) => l.code === getLang());
    const next = LANGS[(currentIndex + 1) % LANGS.length];
    document.querySelectorAll('[data-lang-switcher]').forEach((btn) => {
      btn.textContent = next.autonym;
      btn.setAttribute('aria-label', `${t('header.langSwitchAria')} \u2013 ${next.autonym}`);
    });
  }

  function setLang(code) {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (err) {
      // localStorage unavailable (private mode etc.) - language just won't persist
    }
  }

  /** Move to the next language in the EN -> FR -> AR -> EN cycle and reload. */
  function cycleLang() {
    const currentIndex = LANGS.findIndex((l) => l.code === getLang());
    const next = LANGS[(currentIndex + 1) % LANGS.length];
    setLang(next.code);
    window.location.reload();
  }

  function init() {
    updateDocumentDirection();
    applyStaticTranslations();
    updateLangSwitcherButtons();
    document.querySelectorAll('[data-lang-switcher]').forEach((btn) => {
      btn.addEventListener('click', cycleLang);
    });
  }

  // This script is loaded at the end of <body> (same convention as the
  // other scripts), so the DOM is already parsed by the time this runs -
  // no need to wait for DOMContentLoaded.
  init();

  return { t, plural, categoryName, getLang, setLang, cycleLang, applyStaticTranslations, LANGS };
})();
