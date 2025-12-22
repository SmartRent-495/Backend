const { getFirestore } = require('firebase-admin/firestore');

class PaymentService {
  constructor() {
    this.db = getFirestore();
    this.collection = 'payments';
  }

  /**
   * Create a new payment request (by landlord)
   */
  async create(paymentData) {
    const paymentRef = this.db.collection(this.collection).doc();
    
    const payment = {
      ...paymentData,
      status: 'pending',
      stripePaymentIntentId: null,
      stripeChargeId: null,
      createdAt: new Date(),
      paidAt: null,
    };

    await paymentRef.set(payment);
    return { id: paymentRef.id, ...payment };
  }

  /**
   * Get payment by ID
   */
  async getById(paymentId) {
    const doc = await this.db.collection(this.collection).doc(paymentId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Enrich payment with tenant, property information
   */
  async enrichPayment(payment) {
    try {
      const enriched = { ...payment };

      // Fetch tenant information
      if (payment.tenantId) {
        const tenantDoc = await this.db.collection('users').doc(payment.tenantId).get();
        if (tenantDoc.exists) {
          const tenantData = tenantDoc.data();
          enriched.tenantName = tenantData.name || tenantData.displayName || 'Unknown Tenant';
          enriched.tenantEmail = tenantData.email;
        }
      }

      // Fetch property information
      if (payment.propertyId) {
        const propertyDoc = await this.db.collection('properties').doc(payment.propertyId).get();
        if (propertyDoc.exists) {
          const propertyData = propertyDoc.data();
          enriched.propertyTitle = propertyData.title;
          enriched.propertyAddress = propertyData.address;
          enriched.propertyCity = propertyData.city;
          enriched.propertyState = propertyData.state;
        }
      }

      return enriched;
    } catch (error) {
      console.error('Error enriching payment:', error);
      return payment;
    }
  }

  /**
   * Enrich multiple payments
   */
  async enrichPayments(payments) {
    return Promise.all(payments.map(payment => this.enrichPayment(payment)));
  }

  /**
   * Get all payments for a tenant (payments they need to pay)
   */
  async getByTenant(tenantId) {
    const snap = await this.db
      .collection(this.collection)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();

    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this.enrichPayments(payments);
  }

  /**
   * Get all payments for a landlord (payment requests they created)
   */
  async getByLandlord(landlordId) {
    const snap = await this.db
      .collection(this.collection)
      .where('landlordId', '==', landlordId)
      .orderBy('createdAt', 'desc')
      .get();

    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this.enrichPayments(payments);
  }

  /**
   * Get payments by lease (optional - if you still want to filter by lease)
   */
  async getByLease(leaseId) {
    const snap = await this.db
      .collection(this.collection)
      .where('leaseId', '==', leaseId)
      .orderBy('createdAt', 'desc')
      .get();

    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this.enrichPayments(payments);
  }

  /**
   * Check if payment exists for a specific period (for a tenant/property combo)
   */
  async existsForPeriod(tenantId, propertyId, period) {
    const snap = await this.db
      .collection(this.collection)
      .where('tenantId', '==', tenantId)
      .where('propertyId', '==', propertyId)
      .where('period', '==', period)
      .where('status', 'in', ['pending', 'paid'])
      .limit(1)
      .get();

    return !snap.empty;
  }

  /**
   * Update payment status
   */
  async updateStatus(paymentId, status, extraData = {}) {
    const updateData = { status, ...extraData };
    
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    await this.db.collection(this.collection).doc(paymentId).update(updateData);
  }

  /**
   * Update Stripe payment intent ID
   */
  async updateStripeIntentId(paymentId, stripePaymentIntentId) {
    await this.db.collection(this.collection).doc(paymentId).update({
      stripePaymentIntentId,
    });
  }

  /**
   * Get payment statistics for landlord dashboard
   */
  async getLandlordStats(landlordId) {
    const snap = await this.db
      .collection(this.collection)
      .where('landlordId', '==', landlordId)
      .get();

    const payments = snap.docs.map(d => d.data());
    
    const stats = {
      total: payments.length,
      pending: payments.filter(p => p.status === 'pending').length,
      paid: payments.filter(p => p.status === 'paid').length,
      failed: payments.filter(p => p.status === 'failed').length,
      totalRevenue: payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.totalAmount, 0),
      pendingAmount: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.totalAmount, 0),
      thisMonthRevenue: payments
        .filter(p => {
          if (p.status !== 'paid' || !p.paidAt) return false;
          const paidDate = p.paidAt.toDate ? p.paidAt.toDate() : new Date(p.paidAt);
          const now = new Date();
          return paidDate.getMonth() === now.getMonth() && 
                 paidDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + p.totalAmount, 0),
    };

    return stats;
  }
}

// Singleton instance
let instance;
const getPaymentService = () => {
  if (!instance) instance = new PaymentService();
  return instance;
};

module.exports = { getPaymentService };