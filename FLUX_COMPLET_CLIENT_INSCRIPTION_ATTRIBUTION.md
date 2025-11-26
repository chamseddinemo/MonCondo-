# Documentation Complète - Flux Client : Inscription jusqu'à Attribution de l'Unité

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Étape 1 : Inscription du Visiteur](#étape-1--inscription-du-visiteur)
3. [Étape 2 : Consultation des Immeubles et Unités](#étape-2--consultation-des-immeubles-et-unités)
4. [Étape 3 : Création d'une Demande](#étape-3--création-dune-demande)
5. [Étape 4 : Acceptation par l'Admin](#étape-4--acceptation-par-ladmin)
6. [Étape 5 : Génération et Signature des Documents](#étape-5--génération-et-signature-des-documents)
7. [Étape 6 : Création de la Demande de Paiement](#étape-6--création-de-la-demande-de-paiement)
8. [Étape 7 : Paiement par le Client](#étape-7--paiement-par-le-client)
9. [Étape 8 : Attribution Automatique de l'Unité](#étape-8--attribution-automatique-de-lunité)
10. [Architecture Technique](#architecture-technique)

---

## Vue d'ensemble

Ce document décrit le flux complet d'un nouveau client dans MonCondo+, depuis son inscription en tant que visiteur jusqu'à l'attribution de l'unité après paiement. Le flux suit un processus en 8 étapes principales qui impliquent à la fois le client, l'administrateur et le système automatique.

### Schéma du flux global

```
[Inscription Visiteur] 
    ↓
[Dashboard Visiteur] 
    ↓
[Consultation Immeubles/Unités] 
    ↓
[Création Demande] 
    ↓
[Acceptation Admin] → [Génération Documents] → [Signature Automatique Demandeur]
    ↓
[Création Demande Paiement par Admin]
    ↓
[Paiement par Client]
    ↓
[Attribution Automatique Unité]
    ↓
[Dashboard Client Final (Locataire/Propriétaire)]
```

---

## Étape 1 : Inscription du Visiteur

### Backend

#### Fichier : `backend/controllers/authController.js`

**Fonction** : `exports.register`

**Route** : `POST /api/auth/register`

**Code clé** :
```javascript
exports.register = async (req, res) => {
  const { firstName, lastName, email, password, phone, role } = req.body;
  
  // Créer l'utilisateur avec rôle 'visiteur' par défaut
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: role || 'visiteur'  // Par défaut 'visiteur'
  });

  const token = generateToken(user._id);
  
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role  // 'visiteur'
    }
  });
};
```

**Points importants** :
- Le rôle est automatiquement défini à `'visiteur'` si non spécifié
- L'utilisateur est créé avec `status: 'actif'` par défaut (défini dans le modèle User)
- Un token JWT est généré pour l'authentification immédiate

### Frontend

#### Fichier : `frontend/pages/login.tsx`

**Composant** : `Login`

**Code clé** :
```typescript
const [formData, setFormData] = useState({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'visiteur'  // Rôle hardcodé à 'visiteur'
});

// Dans le formulaire d'inscription
<form onSubmit={handleSubmit}>
  {/* Pas de sélection de rôle - toujours 'visiteur' */}
  <input type="text" value={formData.firstName} ... />
  <input type="text" value={formData.lastName} ... />
  <input type="email" value={formData.email} ... />
  <input type="password" value={formData.password} ... />
  {/* role: 'visiteur' est envoyé automatiquement */}
</form>
```

**Redirection après inscription** :
```typescript
if (response.data.success) {
  await login(formData.email, formData.password);
  router.push('/dashboard');  // Redirige vers /dashboard
}
```

**Fichier** : `frontend/pages/dashboard/index.tsx`

**Redirection selon le rôle** :
```typescript
const getDashboardRoute = () => {
  if (!user) return '/login';
  switch (user.role) {
    case 'admin': return '/dashboard/admin';
    case 'proprietaire': return '/dashboard/proprietaire';
    case 'locataire': return '/dashboard/locataire';
    case 'visiteur': return '/dashboard/visiteur';  // ✅ Redirection visiteur
    default: return '/login';
  }
};
```

---

## Étape 2 : Consultation des Immeubles et Unités

### Backend

#### Fichier : `backend/controllers/buildingController.js`

**Route** : `GET /api/buildings`

**Route** : `GET /api/units/available`

Ces routes sont accessibles à tous les utilisateurs authentifiés, y compris les visiteurs.

### Frontend

#### Fichier : `frontend/pages/dashboard/visiteur.tsx`

**Composant** : `VisiteurDashboard`

**Fonctions de chargement** :
```typescript
const loadBuildings = async () => {
  const url = buildApiUrl('buildings');
  const response = await axios.get(url, getApiConfig(token));
  setBuildings(response.data.data || []);
};

const loadUnits = async () => {
  const url = buildApiUrl('units/available');
  const response = await axios.get(url, getApiConfig(token));
  setUnits(response.data.data || []);
};
```

**Affichage** :
- Liste des immeubles avec détails (nom, adresse, nombre d'unités)
- Liste des unités disponibles avec détails (numéro, type, taille, prix)
- Bouton "Faire une demande" sur chaque unité
- Redirection vers `/request?unitId=:id` lors du clic

**Code clé** :
```typescript
<Link href={`/request?unitId=${unit._id}`}>
  <button className="btn-primary">Faire une demande</button>
</Link>
```

---

## Étape 3 : Création d'une Demande

### Frontend

#### Fichier : `frontend/pages/request.tsx`

**Composant** : `Request`

**Gestion de l'URL** :
```typescript
const { unitId } = router.query;

useEffect(() => {
  if (unitId) {
    setFormData(prev => ({ ...prev, unitId: unitId as string }));
  }
}, [unitId]);
```

**Soumission de la demande** :
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  const requestData = {
    type: formData.type,  // 'location' ou 'achat'
    description: formData.message,
    title: `Demande de ${typeLabel} - Unité ${selectedUnit.unitNumber}`,
    status: 'en_attente',
    priority: 'moyenne',
    unit: formData.unitId
  };
  
  const response = await axios.post(buildApiUrl('requests'), requestData, getApiConfig(token));
  
  // Redirection après création
  if (user.role === 'visiteur') {
    router.replace('/dashboard/visiteur');
  }
};
```

### Backend

#### Fichier : `backend/controllers/requestController.js`

**Fonction** : `exports.createRequest`

**Route** : `POST /api/requests`

**Code clé** :
```javascript
exports.createRequest = async (req, res) => {
  // Ajouter le créateur automatiquement
  req.body.createdBy = req.user._id;
  
  // Générer un titre automatiquement si non fourni
  if (!req.body.title || req.body.title.trim() === '') {
    const typeLabel = req.body.type === 'location' ? 'Location' : 
                     req.body.type === 'achat' ? 'Achat' : 'Demande';
    req.body.title = `Demande de ${typeLabel} - Unité ${unit.unitNumber}`;
  }
  
  // Utiliser le service centralisé pour éviter les doublons
  const { recordRequest } = require('../services/requestSyncService');
  const request = await recordRequest(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Demande créée avec succès',
    data: request
  });
};
```

**Résultat** :
- Demande créée avec `status: 'en_attente'`
- Notification envoyée à l'admin
- Redirection du visiteur vers `/dashboard/visiteur`

---

## Étape 4 : Acceptation par l'Admin

### Backend

#### Fichier : `backend/controllers/requestController.js`

**Fonction** : `exports.acceptRequest`

**Route** : `PUT /api/requests/:id/accept`

**Processus complet** :

#### 4.1. Mise à jour du statut
```javascript
request.status = 'accepte';
request.approvedBy = req.user._id;  // ID de l'admin
request.approvedAt = new Date();

// Ajouter à l'historique
request.statusHistory.push({
  status: 'accepte',
  changedBy: req.user._id,
  changedAt: new Date(),
  comment: 'Demande acceptée par l\'administrateur'
});
```

#### 4.2. Initialisation du paiement initial
```javascript
if ((request.type === 'location' || request.type === 'achat') && request.unit) {
  const unit = await Unit.findById(request.unit._id || request.unit);
  const amount = request.type === 'location' 
    ? (unit.rentPrice || 0)           // Loyer mensuel pour location
    : (unit.salePrice * 0.1);         // 10% pour achat
  
  if (amount > 0) {
    request.initialPayment = {
      amount: amount,
      status: 'en_attente'
    };
  }
}
```

#### 4.3. Génération des documents (INSTANTANÉ)
```javascript
if ((request.type === 'location' || request.type === 'achat') && request.unit) {
  const unit = await Unit.findById(request.unit._id || request.unit)
    .populate('building', 'name address')
    .populate('proprietaire', 'firstName lastName email phone');
  
  const building = unit.building || request.building;
  const requester = await User.findById(request.createdBy._id || request.createdBy);
  const owner = unit.proprietaire || await User.findOne({ role: 'admin' });

  let documentResult;
  if (request.type === 'location') {
    documentResult = await generateLeaseAgreement(request, unit, building, requester, owner);
  } else if (request.type === 'achat') {
    documentResult = await generateSaleAgreement(request, unit, building, requester, owner);
  }

  if (documentResult && documentResult.success) {
    const newDocument = {
      type: docType,  // 'bail' ou 'contrat_vente'
      filename: documentResult.filename,
      path: relativePath,
      signed: false,
      generatedAt: documentResult.generatedAt || new Date()
    };
    
    request.generatedDocuments.push(newDocument);
    
    // ⚡ SIGNATURE AUTOMATIQUE PAR LE DEMANDEUR
    const addedDoc = request.generatedDocuments[request.generatedDocuments.length - 1];
    addedDoc.signed = true;
    addedDoc.signedAt = new Date();
    addedDoc.signedBy = requester._id;  // Signé automatiquement par le demandeur
  }
}
```

#### 4.4. Promotion du visiteur (AUTOMATIQUE)
```javascript
const requester = await User.findById(request.createdBy._id || request.createdBy);
if (requester && requester.role === 'visiteur' && (request.type === 'location' || request.type === 'achat')) {
  const roleToPromote = request.type === 'achat' ? 'proprietaire' : 'locataire';
  
  requester.role = roleToPromote;
  await requester.save();
  
  // ⚠️ IMPORTANT : L'unité n'est PAS encore assignée à ce stade
  // L'assignation se fait uniquement après paiement (voir Étape 8)
}
```

#### 4.5. Sauvegarde et réponse
```javascript
await request.save();  // Sauvegarder avec documents et paiement initial

// Attendre un court instant pour la persistance
await new Promise(resolve => setTimeout(resolve, 100));

// Récupérer la demande peuplée pour la réponse
const populatedRequest = await Request.findById(request._id)
  .populate('building', 'name address')
  .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice')
  .populate('createdBy', 'firstName lastName email')
  .populate('approvedBy', 'firstName lastName')
  .lean();

// Peupler signedBy pour chaque document
if (populatedRequest.generatedDocuments && populatedRequest.generatedDocuments.length > 0) {
  for (let i = 0; i < populatedRequest.generatedDocuments.length; i++) {
    const doc = populatedRequest.generatedDocuments[i];
    if (doc.signedBy && (typeof doc.signedBy === 'string' || doc.signedBy.toString)) {
      const signer = await User.findById(doc.signedBy).select('firstName lastName email').lean();
      if (signer) {
        populatedRequest.generatedDocuments[i].signedBy = signer;
      }
    }
  }
}

return res.status(200).json({
  success: true,
  message: 'Demande acceptée avec succès. Le bail/contrat a été généré.',
  data: populatedRequest  // Contient les documents générés et signés
});
```

### Frontend

#### Fichier : `frontend/pages/admin/requests/[id].tsx`

**Fonction** : `handleAccept`

**Code clé** :
```typescript
const handleAccept = async () => {
  const url = `${apiBaseUrl}/requests/${cleanRequestId}/accept`;
  const response = await axios.put(url, {}, getApiConfig(token));
  
  if (response.status === 200 && response.data && response.data.success) {
    // Mettre à jour immédiatement avec les données de la réponse
    if (response.data.data) {
      setRequest(response.data.data);  // Contient les documents
    }
    
    showSuccessMessage(response.data.message || 'Demande acceptée avec succès !');
    
    // Recharger après 1 seconde pour afficher les documents
    setTimeout(async () => {
      await loadRequest();
    }, 1000);
  }
};
```

**Affichage des documents** :
```typescript
{request.status === 'accepte' && request.generatedDocuments && request.generatedDocuments.length > 0 && (
  <div className="card p-6">
    <h2>Documents générés</h2>
    {request.generatedDocuments.map((doc, index) => (
      <div key={index}>
        <p>{doc.filename}</p>
        {doc.signed && (
          <p>✅ Signé le {new Date(doc.signedAt).toLocaleDateString('fr-CA')} par {doc.signedBy?.firstName} {doc.signedBy?.lastName}</p>
        )}
      </div>
    ))}
  </div>
)}
```

---

## Étape 5 : Génération et Signature des Documents

### Backend - Génération des Documents

#### Fichier : `backend/services/documentService.js`

#### 5.1. Génération du Bail (Location)

**Fonction** : `generateLeaseAgreement`

**Code clé** :
```javascript
async function generateLeaseAgreement(request, unit, building, tenant, owner) {
  const documentsDir = path.join(__dirname, '../uploads/documents');
  const filename = `bail_${unit.unitNumber}_${tenant.lastName}_${Date.now()}.pdf`;
  const filePath = path.join(documentsDir, filename);

  const contractStartDate = new Date();
  contractStartDate.setMonth(contractStartDate.getMonth() + 1);
  const contractEndDate = new Date(contractStartDate);
  contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Contenu du PDF :
  // - En-tête "BAIL DE LOCATION"
  // - Informations propriétaire (owner)
  // - Informations locataire (tenant)
  // - Informations immeuble et unité
  // - Conditions du bail (durée, montant, charges)
  // - Espaces de signature

  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve({
        success: true,
        filename: filename,
        path: filePath,
        type: 'bail',
        generatedAt: new Date()
      });
    });
    stream.on('error', reject);
  });
}
```

#### 5.2. Génération du Contrat de Vente (Achat)

**Fonction** : `generateSaleAgreement`

**Code clé** :
```javascript
async function generateSaleAgreement(request, unit, building, buyer, seller) {
  const documentsDir = path.join(__dirname, '../uploads/documents');
  const filename = `contrat_vente_${unit.unitNumber}_${buyer.lastName}_${Date.now()}.pdf`;
  const filePath = path.join(documentsDir, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Contenu du PDF :
  // - En-tête "CONTRAT DE VENTE"
  // - Informations vendeur (seller/owner)
  // - Informations acheteur (buyer/requester)
  // - Informations propriété
  // - Conditions de vente (prix, acompte 10%, solde)
  // - Conditions générales
  // - Espaces de signature

  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve({
        success: true,
        filename: filename,
        path: filePath,
        type: 'contrat_vente',
        generatedAt: new Date()
      });
    });
    stream.on('error', reject);
  });
}
```

### Signature Automatique

**Dans `acceptRequest`** :
```javascript
// Après ajout du document à request.generatedDocuments
const addedDoc = request.generatedDocuments[request.generatedDocuments.length - 1];
if (addedDoc && requester) {
  addedDoc.signed = true;
  addedDoc.signedAt = new Date();
  addedDoc.signedBy = requester._id;  // Signé par le demandeur
}
```

### Signature Manuelle (Propriétaire/Admin)

**Fichier** : `backend/controllers/requestController.js`

**Fonction** : `exports.signDocument`

**Route** : `PUT /api/requests/:id/documents/:docId/sign`

**Code clé** :
```javascript
exports.signDocument = async (req, res) => {
  const request = await Request.findById(req.params.id);
  const docId = req.params.docId;
  const document = request.generatedDocuments?.find(doc => doc._id.toString() === docId);

  // Vérifier les permissions
  // - Admin peut toujours signer
  // - Demandeur peut signer ses documents
  // - Propriétaire de l'unité peut signer

  document.signed = true;
  document.signedAt = new Date();
  document.signedBy = req.user._id;

  await request.save();

  // Vérifier si tous les documents sont signés
  const allDocumentsSigned = request.generatedDocuments && 
                             request.generatedDocuments.length > 0 &&
                             request.generatedDocuments.every(doc => doc.signed);

  if (allDocumentsSigned) {
    // Notifier les admins pour créer un paiement
    const adminUsers = await User.find({ role: 'admin', isActive: true });
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        type: 'request',
        title: 'Documents signés - Créer un paiement',
        content: `Tous les documents pour la demande ${request.title} ont été signés. Veuillez créer une demande de paiement.`,
        request: request._id,
        isRead: false
      });
    }
  }
};
```

### Frontend - Signature

**Fichier** : `frontend/pages/locataire/requests/[id].tsx`

**Fonction** : `handleSignDocument`

```typescript
const handleSignDocument = async (docId: string | number) => {
  if (!confirm('Êtes-vous sûr de vouloir signer ce document électroniquement ?')) {
    return;
  }

  const url = buildApiUrlWithId('requests', requestId, `documents/${docId}/sign`);
  const response = await axios.put(url, {}, getApiConfig(token));

  if (response.status === 200 && response.data && response.data.success) {
    setRequest(response.data.data);
    showSuccessMessage('Document signé avec succès !');
    await loadRequest();  // Recharger pour voir le statut
  }
};
```

**Note** : Les visiteurs peuvent aussi accéder à cette page via `ProtectedRoute` qui autorise le rôle `'visiteur'`.

---

## Étape 6 : Création de la Demande de Paiement

### Backend

#### Fichier : `backend/controllers/paymentController.js`

**Fonction** : `exports.createPayment`

**Route** : `POST /api/payments`

**Code clé** :
```javascript
exports.createPayment = async (req, res) => {
  const { unitId, payerId, amount, dueDate, description, type, requestId } = req.body;

  // Récupérer l'unité
  const unitDoc = await Unit.findById(unitId || unit)
    .populate('proprietaire', 'firstName lastName email')
    .populate('building', 'name admin');

  // Déterminer le payeur
  const finalPayer = payerId || payer || req.user._id;

  // Déterminer le bénéficiaire (propriétaire ou admin)
  let recipientId = unitDoc.proprietaire?._id || 
                    unitDoc.building?.admin?._id || 
                    (await User.findOne({ role: 'admin' }))?._id;

  const paymentData = {
    unit: unitDoc._id,
    building: unitDoc.building._id,
    payer: finalPayer,
    recipient: recipientId,
    type: type || (request?.type === 'location' ? 'loyer' : 'achat'),
    amount: amount,
    description: description || `Paiement initial pour la demande`,
    dueDate: dueDate,
    requestId: requestId,  // Lien avec la demande
    status: 'en_attente'
  };

  // Utiliser le service centralisé pour éviter les doublons
  const { recordPayment } = require('../services/paymentSyncService');
  const payment = await recordPayment(paymentData);

  // Envoyer une notification au client (payer)
  const payerUser = await User.findById(payment.payer);
  if (payerUser) {
    await notifyPaymentCreated(payment, payerUser);
  }

  res.status(201).json({
    success: true,
    message: 'Paiement créé avec succès.',
    data: payment
  });
};
```

### Frontend

#### Fichier : `frontend/pages/admin/requests/[id].tsx`

**Fonction** : `handleCreatePayment`

**Code clé** :
```typescript
const handleCreatePayment = async () => {
  if (!paymentAmount || !paymentDueDate) {
    showErrorMessage('Veuillez entrer le montant et la date d\'échéance.');
    return;
  }

  const data = {
    requestId: requestId,
    amount: Number(paymentAmount),
    dueDate: paymentDueDate,
    description: paymentDescription || `Paiement initial pour la demande ${request?.title}`,
    type: request?.type === 'location' ? 'loyer' : 'achat',
    unitId: request?.unit?._id,
    payerId: request?.createdBy?._id,
    building: request?.building?._id
  };

  const response = await axios.post(buildApiUrl('payments'), data, getApiConfig(token));

  if (response.status === 201 && response.data && response.data.success) {
    showSuccessMessage('Demande de paiement créée avec succès !');
    setShowCreatePaymentModal(false);
    await loadRequest();  // Recharger pour voir le paiement
  }
};
```

**Conditions d'affichage du bouton** :
```typescript
{request.generatedDocuments && 
 request.generatedDocuments.length > 0 &&
 request.generatedDocuments.every((doc: any) => doc.signed) && (
  <button onClick={() => setShowCreatePaymentModal(true)}>
    💳 Créer une demande de paiement
  </button>
)}
```

**Note** : Le bouton n'apparaît que si tous les documents sont signés.

---

## Étape 7 : Paiement par le Client

### Frontend - Affichage des Paiements

#### Fichier : `frontend/pages/payments/locataire.tsx` ou `frontend/pages/payments/proprietaire.tsx`

**Chargement des paiements** :
```typescript
const loadPayments = async () => {
  const url = buildApiUrl('payments');
  const response = await axios.get(url, getApiConfig(token));
  setPayments(response.data.data || []);
};
```

**Affichage** :
- Liste des paiements en attente
- Bouton "Payer" sur chaque paiement
- Redirection vers `/payments/:id/pay`

### Page de Paiement

#### Fichier : `frontend/pages/payments/[id]/pay.tsx`

**Composant** : `PayPayment`

**Méthodes de paiement** :

#### 7.1. Stripe
```typescript
const handleStripePayment = async () => {
  // 1. Créer l'intent
  const intentResponse = await axios.post(
    buildApiUrlWithId('payments', paymentId, 'stripe/create-intent'),
    { amount: payment.amount },
    getApiConfig(token)
  );
  
  // 2. Confirmer le paiement
  const confirmResponse = await axios.post(
    buildApiUrlWithId('payments', paymentId, 'stripe/confirm'),
    { paymentIntentId: intentResponse.data.paymentIntentId },
    getApiConfig(token)
  );
  
  // 3. Redirection vers succès
  if (confirmResponse.data.success) {
    await loadPayment();  // Recharger le statut
    router.push(`/payments/${paymentId}/success`);
  }
};
```

#### 7.2. Interac
```typescript
const handleInteracPayment = async () => {
  const response = await axios.post(
    buildApiUrlWithId('payments', paymentId, 'interac/instructions'),
    {},
    getApiConfig(token)
  );
  
  // Afficher les instructions Interac
  setInstructions(response.data.data.instructions);
};
```

#### 7.3. Virement Bancaire
```typescript
const handleBankTransfer = async () => {
  const response = await axios.post(
    buildApiUrlWithId('payments', paymentId, 'bank-transfer/instructions'),
    {},
    getApiConfig(token)
  );
  
  // Afficher les instructions de virement
  setInstructions(response.data.data.instructions);
};
```

### Backend - Traitement du Paiement

#### Fichier : `backend/controllers/paymentController.js`

**Fonction** : `exports.confirmStripePayment`

**Route** : `POST /api/payments/:id/stripe/confirm`

**Code clé** :
```javascript
exports.confirmStripePayment = async (req, res) => {
  const { paymentIntentId } = req.body;
  const payment = await Payment.findById(req.params.id);

  // Vérifier l'intent Stripe
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (intent.status === 'succeeded') {
    // Marquer le paiement comme payé
    const { markPaymentAsPaid } = require('../services/paymentService');
    await markPaymentAsPaid(payment._id, 'stripe', intent.id, 'Paiement Stripe confirmé');
    
    res.status(200).json({
      success: true,
      message: 'Paiement confirmé avec succès',
      data: payment
    });
  }
};
```

#### Fichier : `backend/services/paymentService.js`

**Fonction** : `markPaymentAsPaid`

**Processus complet** :
```javascript
async function markPaymentAsPaid(paymentId, paymentMethod, transactionId, notes) {
  const payment = await Payment.findById(paymentId)
    .populate('unit', 'unitNumber proprietaire locataire')
    .populate('payer', 'firstName lastName email');

  // 1. Mettre à jour le statut du paiement
  payment.status = 'paye';
  payment.paidDate = new Date();
  payment.paymentMethod = paymentMethod;
  payment.transactionId = transactionId;
  await payment.save();

  // 2. Si lié à une demande, mettre à jour initialPayment
  if (payment.requestId) {
    const request = await Request.findById(payment.requestId);
    if (request.initialPayment) {
      request.initialPayment.status = 'paye';
      request.initialPayment.paidAt = new Date();
      request.initialPayment.paymentMethod = paymentMethod;
      request.initialPayment.transactionId = transactionId;
      await request.save();
    }
  }

  // 3. Générer le reçu PDF
  const receiptFilename = `receipt_${payment._id}_${Date.now()}.pdf`;
  const receiptPath = path.join(receiptsDir, receiptFilename);
  await generateReceiptPDF(payment, receiptPath);
  
  payment.receipt = {
    filename: receiptFilename,
    path: `uploads/receipts/${receiptFilename}`,
    url: `${API_URL}/uploads/receipts/${receiptFilename}`,
    generatedAt: new Date()
  };
  await payment.save();

  // 4. Attribution automatique de l'unité (voir Étape 8)
  
  // 5. Envoyer notifications
  // - Email de confirmation
  // - Notification au client
  // - Notification à l'admin
}
```

**Page de Succès** : `frontend/pages/payments/[id]/success.tsx`

Affiche le récapitulatif du paiement et permet de télécharger le reçu.

---

## Étape 8 : Attribution Automatique de l'Unité

### Backend

#### Fichier : `backend/services/paymentService.js`

**Dans `markPaymentAsPaid`** :
```javascript
// Si le paiement est lié à une demande de location/achat
if (payment.requestId) {
  const request = await Request.findById(payment.requestId)
    .populate('unit', 'unitNumber proprietaire locataire')
    .populate('createdBy', 'firstName lastName email role');

  if (request && request.unit && (request.type === 'location' || request.type === 'achat')) {
    const unit = await Unit.findById(request.unit._id || request.unit);
    
    // Vérifier que tous les documents sont signés
    const allDocumentsSigned = request.generatedDocuments && 
      request.generatedDocuments.length > 0 &&
      request.generatedDocuments.every(doc => doc.signed === true);
    
    if (allDocumentsSigned) {
      if (request.type === 'location') {
        // Attribuer comme locataire
        unit.locataire = request.createdBy._id || request.createdBy;
        unit.status = 'loue';
        unit.isAvailable = false;
        await unit.save();
        
        // Notification au client
        await Notification.create({
          user: request.createdBy._id,
          type: 'contract',
          title: '🎉 Unité assignée - Vous êtes maintenant locataire !',
          content: `Félicitations ! Votre paiement a été confirmé et l'unité ${unit.unitNumber} vous a été assignée.`,
          request: request._id,
          unit: unit._id,
          isRead: false
        });
      } else if (request.type === 'achat') {
        // Attribuer comme propriétaire
        unit.proprietaire = request.createdBy._id || request.createdBy;
        unit.status = 'vendu';
        unit.isAvailable = false;
        unit.locataire = null;  // Libérer l'ancien locataire
        await unit.save();
        
        // Notification au client
        await Notification.create({
          user: request.createdBy._id,
          type: 'contract',
          title: '🎉 Unité assignée - Vous êtes maintenant propriétaire !',
          content: `Félicitations ! Votre paiement a été confirmé et l'unité ${unit.unitNumber} vous appartient maintenant.`,
          request: request._id,
          unit: unit._id,
          isRead: false
        });
      }
      
      // Mettre à jour le statut de la demande
      request.status = 'termine';
      request.completedAt = new Date();
      request.statusHistory.push({
        status: 'termine',
        changedBy: payment.recipient?._id || payment.recipient,
        changedAt: new Date(),
        comment: 'Paiement confirmé - Unité assignée automatiquement'
      });
      await request.save();
    }
  }
}
```

**Conditions** :
- ✅ Paiement confirmé (`status: 'paye'`)
- ✅ Tous les documents signés
- ✅ Paiement lié à une demande (`requestId` présent)
- ✅ Demande de type `'location'` ou `'achat'`

**Résultat** :
- Unité assignée au client
- Statut de l'unité mis à jour (`'loue'` ou `'vendu'`)
- `isAvailable` mis à `false`
- Demande mise à jour avec `status: 'termine'`
- Notification envoyée au client

### Frontend - Mise à jour du Dashboard

**Fichier** : `frontend/pages/dashboard/proprietaire.tsx` ou `frontend/pages/dashboard/locataire.tsx`

Après paiement et attribution :
- Le client voit son unité dans son dashboard
- Le rôle a déjà été promu lors de l'acceptation (Étape 4)
- L'unité est maintenant assignée et visible

---

## Architecture Technique

### Modèles de Données

#### User
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String,
  password: String (hashé),
  role: 'visiteur' | 'locataire' | 'proprietaire' | 'admin',
  status: 'actif' | 'inactif',
  // ... autres champs
}
```

#### Request
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  type: 'location' | 'achat' | 'maintenance' | ...,
  status: 'en_attente' | 'accepte' | 'refuse' | 'termine',
  unit: ObjectId (ref: Unit),
  building: ObjectId (ref: Building),
  createdBy: ObjectId (ref: User),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  generatedDocuments: [{
    type: 'bail' | 'contrat_vente',
    filename: String,
    path: String,
    signed: Boolean,
    signedAt: Date,
    signedBy: ObjectId (ref: User),
    generatedAt: Date
  }],
  initialPayment: {
    amount: Number,
    status: 'en_attente' | 'paye' | 'en_retard',
    paidAt: Date,
    paymentMethod: String,
    transactionId: String
  },
  statusHistory: [{
    status: String,
    changedBy: ObjectId,
    changedAt: Date,
    comment: String
  }]
}
```

#### Payment
```javascript
{
  _id: ObjectId,
  unit: ObjectId (ref: Unit),
  building: ObjectId (ref: Building),
  payer: ObjectId (ref: User),
  recipient: ObjectId (ref: User),
  type: 'loyer' | 'achat' | 'charges' | ...,
  amount: Number,
  status: 'en_attente' | 'paye' | 'en_retard' | 'annule',
  dueDate: Date,
  paidDate: Date,
  paymentMethod: String,
  transactionId: String,
  requestId: ObjectId (ref: Request),  // Lien avec la demande initiale
  receipt: {
    filename: String,
    path: String,
    url: String,
    generatedAt: Date
  }
}
```

#### Unit
```javascript
{
  _id: ObjectId,
  unitNumber: String,
  building: ObjectId (ref: Building),
  type: String,
  size: Number,
  bedrooms: Number,
  rentPrice: Number,
  salePrice: Number,
  status: 'disponible' | 'loue' | 'vendu' | 'maintenance',
  isAvailable: Boolean,
  proprietaire: ObjectId (ref: User),
  locataire: ObjectId (ref: User)
}
```

### Routes API Utilisées

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion

#### Immeubles et Unités
- `GET /api/buildings` - Liste des immeubles
- `GET /api/units/available` - Unités disponibles

#### Demandes
- `POST /api/requests` - Créer une demande
- `GET /api/requests/:id` - Obtenir une demande
- `PUT /api/requests/:id/accept` - Accepter une demande (Admin)
- `PUT /api/requests/:id/documents/:docId/sign` - Signer un document

#### Paiements
- `POST /api/payments` - Créer une demande de paiement
- `GET /api/payments` - Liste des paiements
- `POST /api/payments/:id/stripe/create-intent` - Créer intent Stripe
- `POST /api/payments/:id/stripe/confirm` - Confirmer paiement Stripe
- `POST /api/payments/:id/interac/instructions` - Instructions Interac
- `POST /api/payments/:id/bank-transfer/instructions` - Instructions virement
- `GET /api/payments/:id/receipt` - Télécharger reçu

#### Dashboard
- `GET /api/dashboard/visiteur/dashboard` - Dashboard visiteur
- `GET /api/dashboard/proprietaire/dashboard` - Dashboard propriétaire
- `GET /api/dashboard/locataire/dashboard` - Dashboard locataire

### Services Backend

#### `backend/services/documentService.js`
- `generateLeaseAgreement()` - Génère le bail PDF
- `generateSaleAgreement()` - Génère le contrat de vente PDF

#### `backend/services/paymentService.js`
- `markPaymentAsPaid()` - Marque le paiement comme payé, génère reçu, attribue l'unité

#### `backend/services/notificationService.js`
- `notifyRequestAccepted()` - Notification après acceptation
- `notifyPaymentCreated()` - Notification après création de paiement
- `notifyUnitAssigned()` - Notification après attribution d'unité

---

## Diagramme de Séquence Complet

```
[Client/Visiteur]          [Frontend]           [Backend]              [Admin]
      |                        |                    |                     |
      |---[1. Inscription]---->|                    |                     |
      |                        |--POST /auth/register->                   |
      |                        |<---Token + User-----|                    |
      |<---[Redir /dashboard]--|                    |                     |
      |                        |                    |                     |
      |---[2. Dashboard Visiteur]--->|                    |                     |
      |                        |--GET /buildings---->|                    |
      |                        |<---Liste Buildings--|                    |
      |                        |--GET /units/available->                  |
      |                        |<---Liste Units------|                    |
      |                        |                    |                     |
      |---[3. Créer Demande]--->|                    |                     |
      |                        |--POST /requests---->|                    |
      |                        |                    |--[Créer Request]--->|
      |                        |                    |--[Notifier Admin]-->|
      |                        |<---Request créée----|                    |
      |<---[Redir /dashboard]--|                    |                     |
      |                        |                    |                     |
      |                        |                    |<---[4. Accepter]---|
      |                        |                    |--[Générer Docs]--->|
      |                        |                    |--[Signer Auto]----->|
      |                        |                    |--[Promouvoir]------>|
      |                        |                    |--[Sauvegarder]----->|
      |                        |                    |<---[Accepté]--------|
      |                        |                    |                     |
      |                        |                    |---[5. Notifier Client]-->|
      |<---[Notification]------|                    |                     |
      |                        |                    |                     |
      |---[Voir Documents]----->|                    |                     |
      |                        |--GET /requests/:id->|                    |
      |                        |<---Request + Docs---|                    |
      |                        |                    |                     |
      |---[Signer Doc]--------->|                    |                     |
      |                        |--PUT /documents/:id/sign->               |
      |                        |                    |--[Marquer signé]--->|
      |                        |                    |--[Notifier Admin]-->|
      |                        |<---Document signé---|                    |
      |                        |                    |                     |
      |                        |                    |<---[6. Créer Paiement]--|
      |                        |                    |--POST /payments---->|
      |                        |                    |--[Notifier Client]-->|
      |<---[Notification]------|                    |                     |
      |                        |                    |                     |
      |---[Voir Paiement]------>|                    |                     |
      |                        |--GET /payments------>|                    |
      |                        |<---Liste Payments---|                    |
      |                        |                    |                     |
      |---[7. Payer]----------->|                    |                     |
      |                        |--POST /stripe/create-intent->            |
      |                        |<---Intent ID--------|                    |
      |                        |--POST /stripe/confirm->                  |
      |                        |                    |--[Marquer payé]---->|
      |                        |                    |--[Générer reçu]---->|
      |                        |                    |--[Attribuer unité]->|
      |                        |                    |--[Notifier Client]-->|
      |                        |<---Paiement confirmé|                    |
      |<---[Redir /success]----|                    |                     |
      |                        |                    |                     |
      |---[8. Dashboard Final]->|                    |                     |
      |                        |--GET /dashboard/locataire|proprietaire-> |
      |                        |<---Unités assignées-|                    |
```

---

## Points Clés à Retenir

### 1. Rôle Visiteur
- **Création** : Automatique lors de l'inscription
- **Redirection** : `/dashboard/visiteur`
- **Actions** : Consultation immeubles/unités, création de demandes

### 2. Promotion Automatique
- **Quand** : Lors de l'acceptation par l'admin (Étape 4)
- **Logique** :
  - Achat → `'proprietaire'`
  - Location → `'locataire'`
- **⚠️ Important** : L'unité n'est PAS encore assignée à ce stade

### 3. Génération de Documents
- **Quand** : Automatiquement lors de l'acceptation
- **Type** :
  - Location → Bail (`generateLeaseAgreement`)
  - Achat → Contrat de vente (`generateSaleAgreement`)
- **Signature** : Automatiquement signé par le demandeur

### 4. Attribution d'Unité
- **Quand** : Automatiquement après paiement ET signature complète
- **Conditions** :
  - ✅ Paiement confirmé (`status: 'paye'`)
  - ✅ Tous les documents signés
- **Résultat** :
  - Location → `unit.locataire = client`, `status = 'loue'`
  - Achat → `unit.proprietaire = client`, `status = 'vendu'`

### 5. Notifications
- Création de demande → Admin notifié
- Acceptation → Client notifié
- Documents signés → Admin notifié (créer paiement)
- Paiement créé → Client notifié
- Paiement confirmé → Client et Admin notifiés
- Unité assignée → Client notifié

---

## Fichiers Clés - Référence Rapide

### Backend
- `backend/controllers/authController.js` - Inscription
- `backend/controllers/requestController.js` - Gestion des demandes, acceptation, signature
- `backend/controllers/paymentController.js` - Création et traitement des paiements
- `backend/services/documentService.js` - Génération PDF (bail, contrat)
- `backend/services/paymentService.js` - Traitement paiement, attribution unité
- `backend/routes/dashboardRoutes.js` - Dashboards par rôle
- `backend/models/Request.js` - Modèle de données Request
- `backend/models/Payment.js` - Modèle de données Payment

### Frontend
- `frontend/pages/login.tsx` - Page d'inscription/connexion
- `frontend/pages/dashboard/index.tsx` - Routeur de redirection par rôle
- `frontend/pages/dashboard/visiteur.tsx` - Dashboard visiteur
- `frontend/pages/request.tsx` - Création de demande
- `frontend/pages/admin/requests/[id].tsx` - Gestion admin (acceptation, paiement)
- `frontend/pages/locataire/requests/[id].tsx` - Signature documents (accessible aux visiteurs)
- `frontend/pages/payments/locataire.tsx` - Paiements locataire
- `frontend/pages/payments/proprietaire.tsx` - Paiements propriétaire
- `frontend/pages/payments/[id]/pay.tsx` - Page de paiement
- `frontend/components/ProtectedRoute.tsx` - Protection des routes par rôle

---

## Conclusion

Ce flux complet garantit :
1. ✅ Un processus automatisé et fluide
2. ✅ Des documents générés instantanément
3. ✅ Une signature automatique par le demandeur
4. ✅ Un suivi clair à chaque étape
5. ✅ Une attribution automatique après paiement
6. ✅ Des notifications à chaque étape importante

Le système est conçu pour minimiser les interventions manuelles tout en garantissant la sécurité et la traçabilité de chaque action.

