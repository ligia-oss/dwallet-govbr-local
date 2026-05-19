CREATE TABLE `userTokenCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handle` varchar(64) NOT NULL,
	`token` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userTokenCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `userTokenCache_handle_unique` UNIQUE(`handle`)
);
