"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import styles from "../index.module.css";

export function LatestPost() {
	const [latestPost] = api.post.getLatest.useSuspenseQuery();

	const utils = api.useUtils();
	const [name, setName] = useState("");
	const createPost = api.post.create.useMutation({
		onSuccess: async () => {
			await utils.post.invalidate();
			setName("");
		},
	});

	return (
		<div className={styles.showcaseContainer}>
			{latestPost ? (
				<p className={styles.showcaseText}>
					Your most recent post: {latestPost.name}
				</p>
			) : (
				<p className={styles.showcaseText}>You have no posts yet.</p>
			)}

			<form
				className={styles.form}
				onSubmit={(e) => {
					e.preventDefault();
					createPost.mutate({ name });
				}}
			>
				<input
					className={styles.input}
					onChange={(e) => setName(e.target.value)}
					placeholder="Title"
					type="text"
					value={name}
				/>
				<button
					className={styles.submitButton}
					disabled={createPost.isPending}
					type="submit"
				>
					{createPost.isPending ? "Submitting..." : "Submit"}
				</button>
			</form>
		</div>
	);
}
