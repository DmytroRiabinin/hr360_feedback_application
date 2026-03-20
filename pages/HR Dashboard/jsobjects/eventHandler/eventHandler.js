export default {
	normalizeId(raw) {
		if (raw === undefined || raw === null) return "";
		return String(raw).replace(/^"|"$/g, "").trim();
	},

	getStatusFilter() {
		// Expected widget: sel_status (Select)
		const raw =
					(sel_status?.selectedOptionValue ?? sel_status?.value ?? sel_status?.selectedValue ?? "");
		return raw ? String(raw).trim() : "";
	},

	getDeadlineFilter() {
		// Expected widget: dp_deadline (DatePicker)
		const raw =
					dp_deadline?.selectedDate ?? dp_deadline?.dateValue ?? dp_deadline?.value ?? "";

		if (!raw) return "";
		if (typeof raw === "string") return raw;

		// Date object -> YYYY-MM-DD
		try {
			return raw.toISOString().slice(0, 10);
		} catch {
			return String(raw);
		}
	},

	getReviewedPersonSearch() {
		// Expected widget: reviewed person search input (implementation-dependent)
		const raw =
					inp_reviewed_person_search?.text ??
					inp_reviewed_person_search?.value ??
					inp_reviewed_person?.text ??
					inp_reviewed_person?.value ??
					"";
		return raw ? String(raw).trim() : "";
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

		await this.loadRequests();
	},

	async loadRequests() {
		if (typeof qry_get_requests === "undefined") {
			console.warn("[JSObject1.loadRequests] qry_get_requests is not defined");
			return;
		}

		const status = this.getStatusFilter();
		const deadline = this.getDeadlineFilter();
		const reviewedPersonSearch = this.getReviewedPersonSearch();

		await qry_get_requests.run({
			status,
			deadline,
			reviewedPersonSearch,
		});
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