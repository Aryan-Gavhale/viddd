import winston from "winston";

const isProd = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf((info) => {
            const { level, message, timestamp, stack, ...meta } = info;
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
            return `${String(timestamp)} [${String(level)}]: ${stack || String(message)}${metaStr}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error", maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: "logs/combined.log", maxsize: 5242880, maxFiles: 5 }),
  ],
  exceptionHandlers: [new winston.transports.File({ filename: "logs/exceptions.log" })],
  rejectionHandlers: [new winston.transports.File({ filename: "logs/rejections.log" })],
});

export default logger;
