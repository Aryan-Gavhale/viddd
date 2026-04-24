import { useState } from "react"


const PaymentManagement = () => {
  const [payments, setPayments] = useState([
    { id: 1, amount: 500, status: "Paid", date: "2023-07-01" },
    { id: 2, amount: 1000, status: "Pending", date: "2023-07-15" },
    { id: 3, amount: 1500, status: "Approved", date: "2023-07-30" },
  ])

  const [newPayment, setNewPayment] = useState({ amount: 0 })

  const requestPayment = () => {
    if (newPayment.amount > 0) {
      const payment = {
        id: payments.length + 1,
        amount: newPayment.amount,
        status: "Pending",
        date: new Date().toISOString().split("T")[0],
      }
      setPayments([...payments, payment])
      setNewPayment({ amount: 0 })
    }
  }

  const approvePayment = (id) => {
    setPayments(payments.map((p) => (p.id === id ? { ...p, status: "Approved" } : p)))
  }

  return (
    <div className="payment-management">
      <h2>Payments</h2>
      <div className="payment-list">
        {payments.map((payment) => (
          <div key={payment.id} className="payment-item">
            <p>Amount: ${payment.amount}</p>
            <p>Status: {payment.status}</p>
            <p>Date: {payment.date}</p>
            {payment.status === "Pending" && <button onClick={() => approvePayment(payment.id)}>Approve</button>}
          </div>
        ))}
      </div>
      <div className="request-payment">
        <input
          type="number"
          value={newPayment.amount}
          onChange={(e) => setNewPayment({ amount: Number.parseFloat(e.target.value) })}
          placeholder="Enter amount"
        />
        <button onClick={requestPayment}>Request Payment</button>
      </div>
    </div>
  )
}

export default PaymentManagement

