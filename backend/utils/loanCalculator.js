/**
 * Utilitaires pour le calcul de prêt immobilier
 */

/**
 * Calcule la mensualité d'un prêt avec intérêts composés
 * Formule: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * où:
 * M = mensualité
 * P = montant du prêt (capital)
 * r = taux d'intérêt mensuel (taux annuel / 12)
 * n = nombre de mensualités
 */
function calculateMonthlyPayment(loanAmount, annualInterestRate, durationMonths) {
  if (loanAmount <= 0 || durationMonths <= 0) {
    return 0;
  }
  
  if (annualInterestRate === 0) {
    // Prêt sans intérêts
    return loanAmount / durationMonths;
  }
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const numerator = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, durationMonths);
  const denominator = Math.pow(1 + monthlyRate, durationMonths) - 1;
  
  return numerator / denominator;
}

/**
 * Calcule le tableau d'amortissement complet
 */
function calculateAmortizationSchedule(loanAmount, annualInterestRate, durationMonths) {
  const schedule = [];
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, durationMonths);
  let remainingBalance = loanAmount;
  const monthlyRate = annualInterestRate / 100 / 12;
  
  for (let month = 1; month <= durationMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);
    
    schedule.push({
      month,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100
    });
  }
  
  return schedule;
}

/**
 * Calcule les intérêts totaux sur la durée du prêt
 */
function calculateTotalInterest(loanAmount, annualInterestRate, durationMonths) {
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, durationMonths);
  const totalPaid = monthlyPayment * durationMonths;
  return totalPaid - loanAmount;
}

/**
 * Calcule le coût total du prêt (capital + intérêts + frais)
 */
function calculateTotalCost(loanAmount, annualInterestRate, durationMonths, additionalFees = {}) {
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, durationMonths);
  const totalPaid = monthlyPayment * durationMonths;
  const totalFees = (additionalFees.insurance || 0) + 
                    (additionalFees.taxes || 0) + 
                    (additionalFees.notary || 0) + 
                    (additionalFees.other || 0);
  
  return totalPaid + totalFees;
}

/**
 * Valide les données d'entrée pour une simulation
 */
function validateLoanInputs(data) {
  const errors = [];
  
  if (!data.propertyAmount || data.propertyAmount <= 0) {
    errors.push('Le montant du bien doit être supérieur à 0');
  }
  
  if (!data.downPayment || data.downPayment < 0) {
    errors.push('L\'apport initial doit être positif ou nul');
  }
  
  if (data.downPayment >= data.propertyAmount) {
    errors.push('L\'apport initial ne peut pas être supérieur ou égal au montant du bien');
  }
  
  const loanAmount = data.propertyAmount - data.downPayment;
  if (loanAmount <= 0) {
    errors.push('Le montant du prêt doit être supérieur à 0');
  }
  
  if (data.interestRate === undefined || data.interestRate < 0 || data.interestRate > 100) {
    errors.push('Le taux d\'intérêt doit être entre 0 et 100%');
  }
  
  if (!data.loanDurationMonths || data.loanDurationMonths < 1) {
    errors.push('La durée du prêt doit être d\'au moins 1 mois');
  }
  
  if (data.loanDurationMonths > 600) { // 50 ans max
    errors.push('La durée du prêt ne peut pas dépasser 600 mois (50 ans)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calcule toutes les valeurs pour une simulation complète
 */
function calculateLoanSimulation(data) {
  const validation = validateLoanInputs(data);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  const loanAmount = data.propertyAmount - data.downPayment;
  const durationMonths = data.loanDurationMonths || (data.loanDurationYears * 12);
  const annualInterestRate = data.interestRate || 0;
  
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, durationMonths);
  const totalInterest = calculateTotalInterest(loanAmount, annualInterestRate, durationMonths);
  const totalCost = calculateTotalCost(loanAmount, annualInterestRate, durationMonths, data.additionalFees || {});
  const amortizationSchedule = calculateAmortizationSchedule(loanAmount, annualInterestRate, durationMonths);
  
  return {
    loanAmount: Math.round(loanAmount * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    amortizationSchedule,
    loanDurationYears: Math.round((durationMonths / 12) * 100) / 100
  };
}

module.exports = {
  calculateMonthlyPayment,
  calculateAmortizationSchedule,
  calculateTotalInterest,
  calculateTotalCost,
  validateLoanInputs,
  calculateLoanSimulation
};

