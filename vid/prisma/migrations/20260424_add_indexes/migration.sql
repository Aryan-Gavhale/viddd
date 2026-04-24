-- Indexes for hot query paths
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_order_timestamp ON "Message" ("orderId", "timestamp" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_job ON "Message" ("jobId") WHERE "jobId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_sender_receiver ON "Message" ("senderId", "receiverId", "timestamp" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_payment_intent ON "Transaction" ("paymentIntentId") WHERE "paymentIntentId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status_history_order ON "OrderStatusHistory" ("order_id", "changedAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_freelancer_status ON "Order" ("freelancer_id", "status") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_client_status ON "Order" ("client_id", "status") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_job ON "Application" ("jobId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_freelancer ON "Application" ("freelancerId", "createdAt" DESC);
