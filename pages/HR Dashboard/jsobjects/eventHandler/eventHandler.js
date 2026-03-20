export default {
	normalizeId(raw) {
		if (raw === undefined || raw === null) return "";
		return String(raw).replace(/^"|"$/g, "").trim();
	},

	getStatusFilter() {
		// Expected widget: sel_status (Select)
		const raw = sel_status?.selectedOptionValue ?? "";
		return raw ? String(raw).trim() : "";
	},

	getDeadlineFilter() {
		// Expected widget: dp_deadline (DatePicker)
		const raw = dp_deadline?.selectedDate ?? "";

		if (!raw) return "";
		if (typeof raw === "string") return raw.slice(0, 10);

		// Date object -> YYYY-MM-DD
		try {
			return raw.toISOString().slice(0, 10);
		} catch {
			return String(raw);
		}
	},

	getReviewedPersonSearch() {
		// Reviewed person is selected by Select widget (email).
		// Keep this method aligned with actual widgetName in UI:
		// `select_reviewed_person_search`.
		const selected =
			select_reviewed_person_search?.selectedOptionValue ??
			"";
		return selected ? String(selected).trim() : "";
	},

	getFilteredRequestsData(statusRaw, deadlineRaw, searchRaw) {
		// Client-side filtering so filters work without needing UI event wiring.
		// Pass explicit args from bindings for better Appsmith reactivity.
		const rows = qry_get_requests?.data ?? [];
		const status =
			(statusRaw !== undefined ? statusRaw : this.getStatusFilter()) || "";
		const deadline =
			deadlineRaw !== undefined
				? (typeof deadlineRaw === "string"
					? deadlineRaw.slice(0, 10)
					: (deadlineRaw?.toISOString?.().slice(0, 10) ?? ""))
				: this.getDeadlineFilter(); // YYYY-MM-DD or ""
		const rawSearch = searchRaw ?? this.getReviewedPersonSearch() ?? "";
		const normalizedSearch = String(rawSearch).trim();
		const effectiveSearch = normalizedSearch === "ALL" ? "" : normalizedSearch;
		const search = effectiveSearch.toLowerCase();

		return (rows ?? []).filter((r) => {
			if (status && String(r?.status ?? "") !== status) return false;

			if (deadline) {
				// Postgres DATE typically comes as YYYY-MM-DD.
				const rd = r?.deadline ? String(r.deadline).slice(0, 10) : "";
				if (rd !== deadline) return false;
			}

			if (search) {
				const name = String(r?.reviewed_person_name ?? "").toLowerCase();
				const email = String(r?.reviewed_person_email ?? "").toLowerCase();
				if (!name.includes(search) && !email.includes(search)) return false;
			}

			return true;
		});
	},

	async loadReviewedPersonOptions() {
		if (typeof qry_get_all_users === "undefined") return;
		await qry_get_all_users.run();

		const users = qry_get_all_users?.data ?? [];
		const options = [
			{ name: "All", email: "ALL" },
			...(users || [])
				.filter((u) => u?.email && u.email !== "ALL")
				.map((u) => ({ name: u.email, email: u.email })),
		];
		await select_reviewed_person_search.setOptions(options);
	},

	async onPageLoad() {
		// Soft guard: if we can't determine role yet, still load MVP data.
		try {
			const email = appsmith?.user?.email;
			if (!email) {
				showAlert("Please login to continue.", "warning");
				return;
			}
		} catch {
			// ignore and continue for local dev
		}

		// Ensure reviewed-person select is populated.
		try {
			await this.loadReviewedPersonOptions();
		} catch {
			// ignore - page can still function without select options
		}

		await this.loadRequests();
	},

	async loadRequests() {
		if (typeof qry_get_requests === "undefined") {
			console.warn("[JSObject1.loadRequests] qry_get_requests is not defined");
			return;
		}
		// Query returns all requests; filtering happens in the tableData binding.
		await qry_get_requests.run();
	},

	async onCreateNew() {
		await storeValue("selectedRequestId", null);
		await navigateTo("Create Request", {}, "SAME_WINDOW");
	},

	async onOpenRequest(requestId) {
		// Prefer explicit param, but also support calling without args
		// (e.g. row click / selection-based handlers).
		const rawId =
					requestId ??
					tbl_requests?.selectedRow?.id ??
					tbl_requests?.selectedRow?.request_id ??
					tbl_requests?.selectedRow?.requestId;

		const rid = this.normalizeId(rawId);
		if (!rid) {
			showAlert("Request id is missing.", "error");
			return;
		}

		await storeValue("selectedRequestId", rid);
		// Also pass params for the next page's query bindings (if they expect params)
		await navigateTo("Request Detail", { requestId: rid, id: rid }, "SAME_WINDOW");
	},
}