CREATE TABLE `m2mTokenCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credentialScope` varchar(64) NOT NULL,
	`tokenHandle` varchar(64) NOT NULL,
	`encryptedToken` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `m2mTokenCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `m2mTokenCache_credentialScope_unique` UNIQUE(`credentialScope`)
);
